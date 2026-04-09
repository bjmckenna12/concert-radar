import httpx
import asyncio
import logging
from database import get_tm_cache, set_tm_cache
from datetime import datetime, timezone
from urllib.parse import quote_plus
import os

logger = logging.getLogger(__name__)

TM_BASE = "https://app.ticketmaster.com/discovery/v2"
TM_API_KEY = os.getenv("TICKETMASTER_API_KEY", "")

# Map country codes to common city names for search context
COUNTRY_CODES = {
    "Australia": "AU", "United States": "US", "United Kingdom": "GB",
    "Canada": "CA", "New Zealand": "NZ", "Germany": "DE",
    "France": "FR", "Japan": "JP", "Netherlands": "NL",
    "Ireland": "IE", "Sweden": "SE", "Norway": "NO",
    "Denmark": "DK", "Belgium": "BE", "Spain": "ES",
    "Italy": "IT", "Brazil": "BR", "Mexico": "MX",
    "Argentina": "AR", "South Korea": "KR",
}

# City → country code mapping for common concert cities
CITY_COUNTRY = {
    "hobart": "AU", "melbourne": "AU", "sydney": "AU", "brisbane": "AU",
    "perth": "AU", "adelaide": "AU", "canberra": "AU", "darwin": "AU",
    "auckland": "NZ", "wellington": "NZ",
    "london": "GB", "manchester": "GB", "glasgow": "GB", "birmingham": "GB",
    "new york": "US", "los angeles": "US", "chicago": "US", "boston": "US",
    "nashville": "US", "austin": "US", "seattle": "US", "miami": "US",
    "toronto": "CA", "vancouver": "CA", "montreal": "CA",
    "berlin": "DE", "amsterdam": "NL", "paris": "FR",
    "tokyo": "JP", "seoul": "KR", "dublin": "IE",
}


async def search_artist_events(
    artist_name: str,
    locations: list,
    country_codes: list = None,
) -> list:
    """
    Search Ticketmaster for upcoming events for a given artist.
    Uses 12-hour cache to avoid hitting rate limits.
    """
    if not TM_API_KEY:
        logger.warning("TICKETMASTER_API_KEY not set — skipping TM search")
        return []

    # Check cache first
    cached = await get_tm_cache(artist_name)
    if cached is not None:
        logger.debug(f"  [TM Cache] {artist_name}: {len(cached)} events (cached)")
        return cached

    results = []

    # Build set of country codes to search
    codes_to_search = set(country_codes or [])
    for loc in locations:
        loc_lower = loc.lower()
        for city, code in CITY_COUNTRY.items():
            if city in loc_lower or loc_lower in city:
                codes_to_search.add(code)
    
    # Always include a worldwide search (no country filter) to catch everything
    search_variants = [None] + list(codes_to_search)

    seen_ids = set()

    async with httpx.AsyncClient(timeout=12.0) as client:
        for country_code in search_variants:
            try:
                params = {
                    "apikey": TM_API_KEY,
                    "keyword": artist_name,
                    "size": 20,
                    "sort": "date,asc",
                    "startDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00Z"),
                    "classificationName": "music",
                }
                if country_code:
                    params["countryCode"] = country_code

                resp = await client.get(f"{TM_BASE}/events.json", params=params)

                if resp.status_code == 401:
                    logger.error("Ticketmaster API key invalid or expired")
                    return []
                if resp.status_code == 429:
                    logger.warning("Ticketmaster rate limit hit — pausing")
                    await asyncio.sleep(2)
                    continue
                if resp.status_code != 200:
                    logger.debug(f"TM returned {resp.status_code} for {artist_name}")
                    continue

                data = resp.json()
                events = data.get("_embedded", {}).get("events", [])

                for event in events:
                    event_id = event.get("id", "")
                    if event_id in seen_ids:
                        continue
                    seen_ids.add(event_id)

                    # Verify artist name matches (TM keyword search can be fuzzy)
                    attractions = event.get("_embedded", {}).get("attractions", [])
                    artist_names_in_event = [a.get("name", "").lower() for a in attractions]
                    artist_lower = artist_name.lower()
                    
                    # Check if our artist is in the event
                    name_match = any(
                        artist_lower in a or a in artist_lower
                        for a in artist_names_in_event
                    ) if artist_names_in_event else True  # keep if no attraction data

                    if not name_match:
                        continue

                    # Extract event details
                    event_name = event.get("name", "")
                    event_url = event.get("url", "")

                    # Date
                    dates = event.get("dates", {})
                    start = dates.get("start", {})
                    event_date = start.get("localDate", "") or start.get("dateTime", "")

                    # Venue
                    venues = event.get("_embedded", {}).get("venues", [])
                    venue_name = ""
                    city_name = ""
                    country_name = ""
                    if venues:
                        v = venues[0]
                        venue_name = v.get("name", "")
                        city_name = v.get("city", {}).get("name", "")
                        country_name = v.get("country", {}).get("name", "")

                    # Price range
                    price_ranges = event.get("priceRanges", [])
                    price_str = ""
                    if price_ranges:
                        pr = price_ranges[0]
                        min_p = pr.get("min")
                        max_p = pr.get("max")
                        currency = pr.get("currency", "")
                        if min_p and max_p:
                            price_str = f"{currency} {min_p:.0f}–{max_p:.0f}"
                        elif min_p:
                            price_str = f"From {currency} {min_p:.0f}"

                    # Sale status
                    sales = event.get("sales", {})
                    public_sale = sales.get("public", {})
                    presales = sales.get("presales", [])
                    
                    now = datetime.now(timezone.utc)
                    concert_type = "ticket_sale"  # default for TM — tickets exist

                    if presales:
                        for ps in presales:
                            ps_start = ps.get("startDateTime", "")
                            ps_end = ps.get("endDateTime", "")
                            if ps_start:
                                try:
                                    ps_dt = datetime.fromisoformat(ps_start.replace("Z", "+00:00"))
                                    ps_end_dt = datetime.fromisoformat(ps_end.replace("Z", "+00:00")) if ps_end else None
                                    if ps_dt <= now and (ps_end_dt is None or ps_end_dt >= now):
                                        concert_type = "presale"
                                        break
                                except Exception:
                                    pass

                    # Build raw text for display
                    raw_parts = [event_name]
                    if venue_name:
                        raw_parts.append(venue_name)
                    if price_str:
                        raw_parts.append(f"Tickets: {price_str}")
                    if presales:
                        presale_names = [ps.get("name", "") for ps in presales if ps.get("name")]
                        if presale_names:
                            raw_parts.append(f"Presales: {', '.join(presale_names[:3])}")

                    results.append({
                        "artist_name": artist_name,
                        "event_title": event_name,
                        "venue": venue_name,
                        "city": city_name,
                        "country": country_name,
                        "event_date": event_date,
                        "source": "ticketmaster",
                        "source_url": event_url,
                        "raw_text": " · ".join(raw_parts)[:400],
                        "concert_type": concert_type,
                        "price": price_str,
                        "tm_event_id": event_id,
                    })

            except Exception as e:
                logger.warning(f"TM search error for {artist_name} ({country_code}): {e}")
                continue

            # Small delay between requests to respect rate limits
            await asyncio.sleep(0.25)

    if results:
        logger.info(f"  [Ticketmaster] {artist_name}: {len(results)} events found")

    # Cache results (even empty results to avoid re-querying)
    await set_tm_cache(artist_name, results)

    return results


async def get_artist_id(artist_name: str) -> str | None:
    """Look up Ticketmaster's internal artist ID for more precise searches."""
    if not TM_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{TM_BASE}/attractions.json",
                params={"apikey": TM_API_KEY, "keyword": artist_name, "size": 3}
            )
            if resp.status_code == 200:
                data = resp.json()
                attractions = data.get("_embedded", {}).get("attractions", [])
                for a in attractions:
                    if a.get("name", "").lower() == artist_name.lower():
                        return a.get("id")
    except Exception:
        pass
    return None
