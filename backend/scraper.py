import httpx
import hashlib
import re
import logging
import feedparser
import asyncio
from bs4 import BeautifulSoup
from urllib.parse import quote_plus

from config import CONCERT_KEYWORDS, LOCATION_KEYWORDS_AU

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


# ─────────────────────────────────────────────
# 1. GOOGLE NEWS RSS  (primary — no rate limit)
# ─────────────────────────────────────────────

async def search_google_news(artist_name: str, locations: list[str]) -> list[dict]:
    """
    Search Google News RSS for concert announcements.
    Returns up to 15 results. Does NOT filter by location — keeps everything
    so the caller can decide what's relevant.
    """
    results = []
    query = f'"{artist_name}" (tour OR concert OR tickets OR "on sale" OR headline OR live)'
    rss_url = f"https://news.google.com/rss/search?q={quote_plus(query)}&hl=en-AU&gl=AU&ceid=AU:en"

    try:
        loop = asyncio.get_event_loop()
        feed = await loop.run_in_executor(None, lambda: feedparser.parse(rss_url))

        for entry in feed.entries[:15]:
            title = entry.get("title", "")
            summary = entry.get("summary", "")
            link = entry.get("link", "")
            published = entry.get("published", "")

            combined = (title + " " + summary).lower()

            # Must mention a concert keyword
            if not any(kw in combined for kw in CONCERT_KEYWORDS):
                continue

            # Determine city from content — tag as unknown if not found
            detected_city = ""
            for loc in locations:
                if loc.lower() in combined:
                    detected_city = loc
                    break
            # Also check AU locations even if not in user's list
            if not detected_city:
                for loc in LOCATION_KEYWORDS_AU:
                    if loc in combined:
                        detected_city = loc.title()
                        break

            results.append({
                "artist_name": artist_name,
                "raw_text": f"{title} — {summary[:300]}",
                "event_title": title,
                "source_url": link,
                "event_date": published,
                "venue": "",
                "city": detected_city,
                "country": "Australia" if detected_city else "",
            })
    except Exception as e:
        logger.warning(f"Google News failed for {artist_name}: {e}")

    return results


# ─────────────────────────────────────────────
# 2. BANDSINTOWN  (dedicated concert database)
# ─────────────────────────────────────────────

async def search_bandsintown(artist_name: str, locations: list[str]) -> list[dict]:
    """
    Scrape Bandsintown public artist page for upcoming events.
    No API key required for public pages.
    """
    results = []
    slug = artist_name.lower().replace(" ", "-").replace("&", "and").replace("'", "").replace(".", "")
    url = f"https://www.bandsintown.com/a/{slug}"

    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=12.0, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return []

            soup = BeautifulSoup(resp.text, "html.parser")
            text = soup.get_text(separator="\n", strip=True)

            # Parse date/venue/location patterns from the page text
            date_pattern = re.compile(
                r'(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+'
                r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}',
                re.IGNORECASE
            )

            lines = [l.strip() for l in text.split("\n") if l.strip()]
            for i, line in enumerate(lines):
                if date_pattern.search(line):
                    # Grab surrounding lines for venue/city info
                    context = " ".join(lines[max(0,i-1):min(len(lines),i+4)])
                    context_lower = context.lower()

                    # Check if in user locations or AU
                    detected_city = ""
                    for loc in locations:
                        if loc.lower() in context_lower:
                            detected_city = loc
                            break
                    if not detected_city:
                        for loc in LOCATION_KEYWORDS_AU:
                            if loc in context_lower:
                                detected_city = loc.title()
                                break

                    results.append({
                        "artist_name": artist_name,
                        "raw_text": context[:400],
                        "event_title": f"{artist_name} live",
                        "source_url": url,
                        "event_date": line,
                        "venue": lines[i+1] if i+1 < len(lines) else "",
                        "city": detected_city,
                        "country": "Australia" if detected_city else "",
                    })

                    if len(results) >= 10:
                        break

    except Exception as e:
        logger.debug(f"Bandsintown scrape failed for {artist_name}: {e}")

    return results


# ─────────────────────────────────────────────
# 3. ARTIST WEBSITE  (fallback)
# ─────────────────────────────────────────────

TOUR_PAGE_SUFFIXES = ["/tour", "/shows", "/live", "/dates", "/tickets", "/events"]

async def find_tour_page_url(artist_name: str) -> str | None:
    """Try common URL patterns for artist tour pages without Google search."""
    slug = artist_name.lower().replace(" ", "").replace("&", "and").replace("'", "").replace(".", "")
    slug_hyphen = artist_name.lower().replace(" ", "-").replace("&", "and").replace("'", "").replace(".", "")

    candidates = []
    for suffix in TOUR_PAGE_SUFFIXES:
        candidates.append(f"https://www.{slug}.com{suffix}")
        candidates.append(f"https://www.{slug_hyphen}.com{suffix}")
        candidates.append(f"https://{slug}.com{suffix}")

    async with httpx.AsyncClient(headers=HEADERS, timeout=6.0, follow_redirects=True) as client:
        for url in candidates[:8]:  # limit attempts
            try:
                resp = await client.head(url)
                if resp.status_code in (200, 301, 302):
                    logger.info(f"Found tour page for {artist_name}: {url}")
                    return url
            except Exception:
                continue
            await asyncio.sleep(0.1)
    return None


async def scrape_tour_page(url: str) -> tuple[str, str]:
    """Scrape an artist's tour page. Returns (text_content, page_hash)."""
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return "", ""
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()
            text = soup.get_text(separator=" ", strip=True)
            text = re.sub(r'\s+', ' ', text)
            return text, hashlib.md5(text.encode()).hexdigest()
    except Exception as e:
        logger.warning(f"Failed to scrape {url}: {e}")
        return "", ""


def extract_concerts_from_text(text: str, artist_name: str, locations: list[str]) -> list[dict]:
    """Parse tour page text for concert info. Keeps results even without location match."""
    concerts = []
    text_lower = text.lower()

    if not any(kw in text_lower for kw in CONCERT_KEYWORDS):
        return []

    date_pattern = re.compile(
        r'\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2}|'
        r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}'
        r'(?:st|nd|rd|th)?(?:,?\s+\d{4})?)',
        re.IGNORECASE
    )

    sentences = re.split(r'(?<=[.!?\n])\s+', text)
    for sentence in sentences:
        if len(sentence) > 500:
            continue
        sentence_lower = sentence.lower()
        has_concert_kw = any(kw in sentence_lower for kw in CONCERT_KEYWORDS)
        has_date = bool(date_pattern.search(sentence))

        if not (has_concert_kw or has_date):
            continue

        date_match = date_pattern.search(sentence)
        detected_city = next((loc for loc in locations if loc.lower() in sentence_lower), "")
        if not detected_city:
            for loc in LOCATION_KEYWORDS_AU:
                if loc in sentence_lower:
                    detected_city = loc.title()
                    break

        concerts.append({
            "artist_name": artist_name,
            "raw_text": sentence.strip()[:400],
            "event_date": date_match.group(0) if date_match else "",
            "venue": "",
            "city": detected_city,
            "country": "Australia" if detected_city else "",
        })

    return concerts[:10]


# ─────────────────────────────────────────────
# 4. TWITTER/NITTER  (last resort)
# ─────────────────────────────────────────────

async def search_twitter_public(artist_name: str) -> list[dict]:
    """Search public tweets via Nitter. Falls back gracefully."""
    results = []
    query = f"{artist_name} tour OR concert OR tickets"
    nitter_instances = ["https://nitter.net", "https://nitter.privacydev.net"]

    for instance in nitter_instances:
        try:
            url = f"{instance}/search?q={quote_plus(query)}&f=tweets"
            async with httpx.AsyncClient(headers=HEADERS, timeout=8.0, follow_redirects=True) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    continue
                soup = BeautifulSoup(resp.text, "html.parser")
                for tweet in soup.find_all("div", class_="tweet-content")[:5]:
                    text = tweet.get_text(strip=True)
                    if any(kw in text.lower() for kw in CONCERT_KEYWORDS):
                        results.append({
                            "artist_name": artist_name,
                            "raw_text": text[:400],
                            "event_title": f"{artist_name} — Twitter",
                            "source_url": instance,
                            "event_date": "",
                            "venue": "",
                            "city": "",
                            "country": "",
                        })
            if results:
                break
        except Exception:
            continue

    return results
