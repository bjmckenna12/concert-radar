import asyncio
import json
import logging
from datetime import datetime, timezone

from database import (
    get_all_users, get_user_artists, upsert_artists,
    update_artist_tour_page, save_concert, delete_duplicate_concerts,
    delete_past_concerts, reclassify_stale_presales,
    get_unnotified_concerts, mark_concerts_notified
)
from scraper import search_google_news, search_twitter_public
from ticketmaster import search_artist_events
from classifier import classify_concert
from notifier import send_alert_email
from routers.auth import refresh_spotify_token
from routers.artists import fetch_all_followed_artists

logger = logging.getLogger(__name__)

BATCH_SIZE = 10


def is_future_date(date_str: str, is_news: bool = False) -> bool:
    """
    News articles: always keep (article date != concert date).
    TM/scraped dates: only keep future events.
    """
    if is_news or not date_str:
        return True
    try:
        from dateutil import parser as dp
        dt = dp.parse(date_str, fuzzy=True)
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
    logger.info(f"=== SCAN START: {user.get('display_name', '')} ===")

    # Sync Spotify artists
    try:
        access_token = await refresh_spotify_token(user)
        artists = await fetch_all_followed_artists(access_token)
        if artists:
            await upsert_artists(user_id, artists)
            logger.info(f"Synced {len(artists)} artists")
    except Exception as e:
        logger.warning(f"Spotify sync failed: {e}")

    # Build search locations
    search_locations = ["worldwide"]
    try:
        fav_cities = json.loads(user.get("favorite_cities") or "[]")
        for city in fav_cities:
            if city not in search_locations:
                search_locations.append(city)
        if user.get("location_override"):
            search_locations.append(user["location_override"])
    except Exception:
        pass

    logger.info(f"Search locations: {search_locations}")

    db_artists = await get_user_artists(user_id)
    logger.info(f"Scanning {len(db_artists)} artists in batches of {BATCH_SIZE}")

    total_new = 0
    for i in range(0, len(db_artists), BATCH_SIZE):
        batch = db_artists[i:i + BATCH_SIZE]
        tasks = [scan_artist(user, artist, search_locations) for artist in batch]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, int):
                total_new += r
        await asyncio.sleep(2)

    await delete_duplicate_concerts(user_id)
    await delete_past_concerts(user_id)
    await reclassify_stale_presales(user_id)
    logger.info(f"=== SCAN DONE: {total_new} new concerts ===")

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

    async def save_items(items: list, is_news: bool = False) -> int:
        saved = 0
        for item in items:
            if not is_future_date(item.get("event_date", ""), is_news=is_news):
                continue
            concert_type = item.get("concert_type") or classify_concert(
                item.get("raw_text", ""), item.get("event_title", "")
            )
            # Skip cancelled/postponed events entirely
            if concert_type == "cancelled":
                logger.debug(f"  Skipping cancelled event: {item.get('event_title', '')[:60]}")
                continue
            # Skip cancelled events entirely
            concert = {
                "user_id": user_id,
                "artist_id": artist_spotify_id,
                "artist_name": artist_name,
                "event_title": item.get("event_title", ""),
                "venue": item.get("venue", ""),
                "city": item.get("city", ""),
                "country": item.get("country", ""),
                "event_date": item.get("event_date", ""),
                "source": item.get("source", "unknown"),
                "source_url": item.get("source_url", ""),
                "raw_text": item.get("raw_text", ""),
                "concert_type": concert_type,
            }
            if await save_concert(concert):
                saved += 1
        return saved

    # 1. TICKETMASTER — primary, confirmed data, worldwide
    try:
        tm_events = await search_artist_events(artist_name, locations)
        if tm_events:
            logger.info(f"  [TM] {artist_name}: {len(tm_events)} events")
        n = await save_items(tm_events, is_news=False)
        new_count += n
        if n:
            logger.info(f"  [TM] {artist_name}: {n} new saved")
    except Exception as e:
        logger.warning(f"  [TM] {artist_name} error: {e}")

    # 2. GOOGLE NEWS — early announcements, pre-Ticketmaster signals
    try:
        news = await search_google_news(artist_name, locations)
        if news:
            logger.info(f"  [News] {artist_name}: {len(news)} articles")
        n = await save_items(news, is_news=True)
        new_count += n
        if n:
            logger.info(f"  [News] {artist_name}: {n} new saved")
    except Exception as e:
        logger.warning(f"  [News] {artist_name} error: {e}")

    # 3. TWITTER — only as last resort for artists with no TM results
    if new_count == 0 and user.get("monitor_twitter", 1):
        try:
            tweets = await search_twitter_public(artist_name)
            n = await save_items(tweets, is_news=True)
            new_count += n
        except Exception:
            pass

    return new_count
