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

BATCH_SIZE = 10


def is_future_date(date_str: str) -> bool:
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
    logger.info(f"[{datetime.utcnow().isoformat()}] Starting monitoring cycle")
    users = await get_all_users()
    for user in users:
        try:
            await run_user_monitoring(user)
        except Exception as e:
            logger.error(f"Error monitoring user {user['id']}: {e}")
    logger.info("Monitoring cycle complete")


async def run_user_monitoring(user: dict):
    user_id = user["id"]
    logger.info(f"=== SCAN START: {user.get('display_name','')} ===")

    # Sync Spotify artists
    try:
        access_token = await refresh_spotify_token(user)
        artists = await fetch_all_followed_artists(access_token)
        if artists:
            await upsert_artists(user_id, artists)
            logger.info(f"Synced {len(artists)} Spotify artists")
    except Exception as e:
        logger.warning(f"Spotify sync failed: {e}")

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
    for i in range(0, len(db_artists), BATCH_SIZE):
        batch = db_artists[i:i + BATCH_SIZE]
        batch_names = [a["artist_name"] for a in batch]
        logger.info(f"Batch {i // BATCH_SIZE + 1}: {batch_names}")
        tasks = [scan_artist(user, artist, search_locations) for artist in batch]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, int):
                total_new += r
            elif isinstance(r, Exception):
                logger.warning(f"Batch error: {r}")
        await asyncio.sleep(2)

    await delete_duplicate_concerts(user_id)
    logger.info(f"=== SCAN DONE: {total_new} new concerts found ===")

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


async def scan_artist(user: dict, artist: dict, locations: list) -> int:
    artist_name = artist["artist_name"]
    user_id = user["id"]
    artist_spotify_id = artist["spotify_artist_id"]
    new_count = 0

    async def save_items(items: list, source: str, source_url: str = "") -> int:
        saved = 0
        for item in items:
            if not is_future_date(item.get("event_date", "")):
                continue
            concert_type = classify_concert(
                item.get("raw_text", ""), item.get("event_title", "")
            )
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

    # 1. Google News RSS
    try:
        news = await search_google_news(artist_name, locations)
        logger.info(f"  [News] {artist_name}: {len(news)} articles found")
        n = await save_items(news, "news")
        new_count += n
        if n:
            logger.info(f"  [News] {artist_name}: {n} NEW saved")
    except Exception as e:
        logger.warning(f"  [News] {artist_name} error: {e}")

    # 2. Bandsintown
    try:
        bit = await search_bandsintown(artist_name, locations)
        logger.info(f"  [Bandsintown] {artist_name}: {len(bit)} events found")
        n = await save_items(bit, "bandsintown")
        new_count += n
        if n:
            logger.info(f"  [Bandsintown] {artist_name}: {n} NEW saved")
    except Exception as e:
        logger.warning(f"  [Bandsintown] {artist_name} error: {e}")

    # 3. Artist website — only if nothing found yet
    if new_count == 0 and user.get("monitor_websites", 1):
        try:
            tour_url = artist.get("tour_page_url")
            if not tour_url:
                tour_url = await find_tour_page_url(artist_name)
            if tour_url:
                logger.info(f"  [Website] {artist_name}: trying {tour_url}")
                page_text, page_hash = await scrape_tour_page(tour_url)
                if page_hash and page_hash != artist.get("last_tour_page_hash"):
                    await update_artist_tour_page(artist["id"], tour_url, page_hash)
                    found = extract_concerts_from_text(page_text, artist_name, locations)
                    n = await save_items(found, "website", tour_url)
                    new_count += n
                    if n:
                        logger.info(f"  [Website] {artist_name}: {n} NEW saved")
            else:
                logger.debug(f"  [Website] {artist_name}: no tour page found")
        except Exception as e:
            logger.warning(f"  [Website] {artist_name} error: {e}")

    # 4. Twitter — last resort
    if new_count == 0 and user.get("monitor_twitter", 1):
        try:
            tweets = await search_twitter_public(artist_name)
            logger.info(f"  [Twitter] {artist_name}: {len(tweets)} tweets found")
            n = await save_items(tweets, "twitter")
            new_count += n
        except Exception as e:
            logger.debug(f"  [Twitter] {artist_name} error: {e}")

    return new_count
