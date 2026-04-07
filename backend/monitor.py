import asyncio
import json
import logging
from datetime import datetime, timezone

from database import (
    get_all_users, get_user_artists, upsert_artists,
    update_artist_tour_page, save_concert, delete_duplicate_concerts,
    get_unnotified_concerts, mark_concerts_notified
)
from scraper import (
    search_google_news, search_bandsintown,
    find_tour_page_url, scrape_tour_page, extract_concerts_from_text,
    search_twitter_public
)
from classifier import classify_concert
from notifier import send_alert_email
from routers.auth import refresh_spotify_token
from routers.artists import fetch_all_followed_artists

logger = logging.getLogger(__name__)

BATCH_SIZE = 10  # Process 10 artists concurrently


def is_future_date(date_str: str) -> bool:
    """Return True if date is in the future or unparseable (keep if unsure)."""
    if not date_str:
        return True
    try:
        from dateutil import parser as dateparser
        dt = dateparser.parse(date_str, fuzzy=True)
        if dt is None:
            return True
        now = datetime.now(timezone.utc)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt >= now
    except Exception:
        return True


async def run_monitoring_cycle():
    """Run a full monitoring cycle for all users."""
    logger.info(f"[{datetime.utcnow().isoformat()}] Starting monitoring cycle")
    users = await get_all_users()
    logger.info(f"Monitoring {len(users)} users")
    for user in users:
        try:
            await run_user_monitoring(user)
        except Exception as e:
            logger.error(f"Error monitoring user {user['id']}: {e}")
    logger.info("Monitoring cycle complete")


async def run_user_monitoring(user: dict):
    """Run monitoring for a single user."""
    user_id = user["id"]
    logger.info(f"Starting scan for user {user_id} ({user.get('display_name', '')})")

    # Sync Spotify artists
    try:
        access_token = await refresh_spotify_token(user)
        artists = await fetch_all_followed_artists(access_token)
        if artists:
            await upsert_artists(user_id, artists)
            logger.info(f"Synced {len(artists)} artists")
    except Exception as e:
        logger.warning(f"Failed to sync Spotify artists: {e}")

    # Build search locations
    search_locations = []
    if user.get("location_override"):
        search_locations.append(user["location_override"])
    else:
        search_locations.append("Australia")

    try:
        fav_cities = json.loads(user.get("favorite_cities") or "[]")
        for city in fav_cities:
            if city not in search_locations:
                search_locations.append(city)
    except Exception:
        pass

    logger.info(f"Search locations: {search_locations}")

    db_artists = await get_user_artists(user_id)
    logger.info(f"Scanning {len(db_artists)} artists in batches of {BATCH_SIZE}")

    total_new = 0

    # Process in batches of BATCH_SIZE concurrently
    for i in range(0, len(db_artists), BATCH_SIZE):
        batch = db_artists[i:i + BATCH_SIZE]
        logger.info(f"Processing batch {i // BATCH_SIZE + 1} ({len(batch)} artists)")
        tasks = [scan_artist(user, artist, search_locations) for artist in batch]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, int):
                total_new += r
            elif isinstance(r, Exception):
                logger.debug(f"Batch scan error: {r}")
        # Small delay between batches to be polite
        await asyncio.sleep(2)

    # Clean up duplicates
    await delete_duplicate_concerts(user_id)
    logger.info(f"Scan complete — {total_new} new concerts found for {user_id}")

    # Send email alerts
    if user.get("alert_email"):
        unnotified = await get_unnotified_concerts(user_id)
        if unnotified:
            success = await send_alert_email(
                to_email=user["alert_email"],
                user_name=user.get("display_name", "there"),
                concerts=unnotified
            )
            if success:
                await mark_concerts_notified([c["id"] for c in unnotified])
                logger.info(f"Sent alert for {len(unnotified)} concerts")
    else:
        logger.info("No alert_email set — skipping notification")


async def scan_artist(user: dict, artist: dict, locations: list) -> int:
    """
    Scan all sources for a single artist.
    Order: Google News → Bandsintown → Artist Website → Twitter
    Returns count of new concerts saved.
    """
    artist_name = artist["artist_name"]
    user_id = user["id"]
    artist_spotify_id = artist["spotify_artist_id"]
    new_count = 0

    async def save_items(items: list, source: str, source_url: str = "") -> int:
        saved = 0
        for item in items:
            if not is_future_date(item.get("event_date", "")):
                continue
            concert_type = classify_concert(item.get("raw_text", ""), item.get("event_title", ""))
            concert = {
                "user_id": user_id,
                "artist_id": artist_spotify_id,
                "artist_name": artist_name,
                "event_title": item.get("event_title", ""),
                "venue": item.get("venue", ""),
                "city": item.get("city", ""),
                "country": item.get("country", ""),
                "event_date": item.get("event_date", ""),
                "source": source,
                "source_url": item.get("source_url") or source_url,
                "raw_text": item.get("raw_text", ""),
                "concert_type": concert_type,
            }
            if await save_concert(concert):
                saved += 1
        return saved

    # 1. Google News RSS — primary source
    try:
        news = await search_google_news(artist_name, locations)
        n = await save_items(news, "news")
        new_count += n
        if n:
            logger.info(f"  [News] {artist_name}: {n} new")
    except Exception as e:
        logger.debug(f"News error for {artist_name}: {e}")

    # 2. Bandsintown — dedicated concert database
    try:
        bit_results = await search_bandsintown(artist_name, locations)
        n = await save_items(bit_results, "bandsintown")
        new_count += n
        if n:
            logger.info(f"  [Bandsintown] {artist_name}: {n} new")
    except Exception as e:
        logger.debug(f"Bandsintown error for {artist_name}: {e}")

    # 3. Artist website — only if no results yet from above
    if new_count == 0 and user.get("monitor_websites", 1):
        try:
            tour_url = artist.get("tour_page_url")
            if not tour_url:
                tour_url = await find_tour_page_url(artist_name)
            if tour_url:
                page_text, page_hash = await scrape_tour_page(tour_url)
                if page_hash and page_hash != artist.get("last_tour_page_hash"):
                    await update_artist_tour_page(artist["id"], tour_url, page_hash)
                    found = extract_concerts_from_text(page_text, artist_name, locations)
                    n = await save_items(found, "website", tour_url)
                    new_count += n
                    if n:
                        logger.info(f"  [Website] {artist_name}: {n} new")
        except Exception as e:
            logger.debug(f"Website error for {artist_name}: {e}")

    # 4. Twitter/Nitter — last resort, only if still nothing
    if new_count == 0 and user.get("monitor_twitter", 1):
        try:
            tweets = await search_twitter_public(artist_name)
            n = await save_items(tweets, "twitter")
            new_count += n
            if n:
                logger.info(f"  [Twitter] {artist_name}: {n} new")
        except Exception as e:
            logger.debug(f"Twitter error for {artist_name}: {e}")

    return new_count
