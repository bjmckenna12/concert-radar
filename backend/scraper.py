import httpx
import hashlib
import re
import logging
import feedparser
from bs4 import BeautifulSoup
from urllib.parse import quote_plus
import asyncio

from config import CONCERT_KEYWORDS, LOCATION_KEYWORDS_AU

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Known artist website patterns — avoids needing Google search
TOUR_PAGE_PATTERNS = [
    "https://www.{slug}.com/tour",
    "https://www.{slug}.com/shows",
    "https://www.{slug}.com/live",
    "https://www.{slug}.com/dates",
    "https://{slug}.com/tour",
    "https://{slug}.com/shows",
]

async def find_tour_page_url(artist_name: str) -> str | None:
    """
    Try known URL patterns for artist tour pages.
    Avoids Google search entirely to prevent rate limiting.
    """
    slug = artist_name.lower().replace(" ", "").replace("&", "and").replace("'", "").replace(".", "")
    slug_hyphen = artist_name.lower().replace(" ", "-").replace("&", "and").replace("'", "").replace(".", "")

    candidates = [
        f"https://www.{slug}.com/tour",
        f"https://www.{slug}.com/shows",
        f"https://{slug}.com/tour",
        f"https://{slug}.com/shows",
        f"https://www.{slug_hyphen}.com/tour",
        f"https://www.{slug_hyphen}.com/shows",
        f"https://{slug_hyphen}.com/tour",
    ]

    async with httpx.AsyncClient(headers=HEADERS, timeout=8.0, follow_redirects=True) as client:
        for url in candidates:
            try:
                resp = await client.head(url)
                if resp.status_code in (200, 301, 302):
                    logger.info(f"Found tour page for {artist_name}: {url}")
                    return url
            except Exception:
                continue
            await asyncio.sleep(0.2)

    return None


async def scrape_tour_page(url: str) -> tuple[str, str]:
    """
    Scrape an artist's tour page.
    Returns (text_content, page_hash).
    """
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
            page_hash = hashlib.md5(text.encode()).hexdigest()
            return text, page_hash
    except Exception as e:
        logger.warning(f"Failed to scrape {url}: {e}")
        return "", ""


def extract_concerts_from_text(text: str, artist_name: str, locations: list[str]) -> list[dict]:
    """
    Parse scraped text for concert mentions near given locations.
    """
    concerts = []
    text_lower = text.lower()

    if not any(kw in text_lower for kw in CONCERT_KEYWORDS):
        return []

    date_pattern = re.compile(
        r'\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2}|'
        r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)',
        re.IGNORECASE
    )

    sentences = re.split(r'(?<=[.!?\n])\s+', text)
    for sentence in sentences:
        sentence_lower = sentence.lower()
        has_location = any(loc.lower() in sentence_lower for loc in locations)
        has_concert_kw = any(kw in sentence_lower for kw in CONCERT_KEYWORDS)
        has_au_location = any(loc in sentence_lower for loc in LOCATION_KEYWORDS_AU)
        has_date = bool(date_pattern.search(sentence))

        if (has_location or has_au_location) and (has_concert_kw or has_date) and len(sentence) < 500:
            date_match = date_pattern.search(sentence)
            concerts.append({
                "artist_name": artist_name,
                "raw_text": sentence.strip()[:400],
                "event_date": date_match.group(0) if date_match else "",
                "venue": "",
                "city": next((loc for loc in locations if loc.lower() in sentence_lower), ""),
                "country": "Australia",
            })

    return concerts


async def search_google_news(artist_name: str, locations: list[str]) -> list[dict]:
    """
    Search Google News RSS for concert announcements.
    RSS feed is not rate limited like Google Search.
    """
    results = []
    location_str = " OR ".join(f'"{loc}"' for loc in locations[:4]) if locations else "Australia"
    query = f'"{artist_name}" (tour OR concert OR tickets OR "on sale") ({location_str})'
    rss_url = f"https://news.google.com/rss/search?q={quote_plus(query)}&hl=en-AU&gl=AU&ceid=AU:en"

    try:
        # feedparser is synchronous — run in thread to avoid blocking
        loop = asyncio.get_event_loop()
        feed = await loop.run_in_executor(None, lambda: feedparser.parse(rss_url))

        for entry in feed.entries[:8]:
            title = entry.get("title", "")
            summary = entry.get("summary", "")
            link = entry.get("link", "")
            published = entry.get("published", "")

            combined = (title + " " + summary).lower()
            if any(kw in combined for kw in CONCERT_KEYWORDS):
                results.append({
                    "artist_name": artist_name,
                    "raw_text": f"{title} — {summary[:200]}",
                    "event_title": title,
                    "source_url": link,
                    "event_date": published,
                    "venue": "",
                    "city": next((loc for loc in locations if loc.lower() in combined), ""),
                    "country": "Australia",
                })
    except Exception as e:
        logger.warning(f"Google News search failed for {artist_name}: {e}")

    return results


async def search_twitter_public(artist_name: str) -> list[dict]:
    """
    Search for public tweets about artist tours via Nitter.
    Falls back gracefully if Nitter is unavailable.
    """
    results = []
    query = f"{artist_name} tour OR concert OR tickets"
    nitter_instances = [
        "https://nitter.net",
        "https://nitter.privacydev.net",
    ]

    for instance in nitter_instances:
        try:
            search_url = f"{instance}/search?q={quote_plus(query)}&f=tweets"
            async with httpx.AsyncClient(headers=HEADERS, timeout=8.0, follow_redirects=True) as client:
                resp = await client.get(search_url)
                if resp.status_code != 200:
                    continue

                soup = BeautifulSoup(resp.text, "html.parser")
                tweets = soup.find_all("div", class_="tweet-content")[:5]
                for tweet in tweets:
                    text = tweet.get_text(strip=True)
                    if any(kw in text.lower() for kw in CONCERT_KEYWORDS):
                        results.append({
                            "artist_name": artist_name,
                            "raw_text": text[:400],
                            "event_title": f"Twitter mention: {text[:100]}",
                            "source_url": instance,
                            "event_date": "",
                            "venue": "",
                            "city": "",
                            "country": "",
                        })
            if results:
                break
        except Exception as e:
            logger.debug(f"Nitter {instance} failed: {e}")
            continue

    return results
