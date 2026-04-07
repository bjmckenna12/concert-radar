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
    find_tour_page_url, scrape_tour_page, extract_concerts_from_text,
    search_google_news, search_twitter_public
)
from classifier import classify_concert
from notifier import send_alert_email
from routers.auth import refresh_spotify_token
from routers.artists import fetch_all_followed_artists

logger = logging.getLogger(__name__)


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
    logger.info(f"Starting scan for user {user_id} ({user.get('display_name', '')})")

    # Sync Spotify artists
    try:
        access_token = await refresh_spotify_token(user)
        artists = await fetch_all_followed_artists(access_token)
        if artists:
            await upsert_artists(user_id, artists)
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

    logger.info(f"Searching locations: {search_locations}")

    db_artists = await get_user_artists(user_id)
    total_new = 0

    for artist in db_artists:
        new_count = await scan_artist(user, artist, search_locations)
        total_new += new_count
        await asyncio.sleep(1.5)

    # Clean up duplicates after scan
    await delete_duplicate_concerts(user_id)
    logger.info(f"Found {total_new} new concerts for user {user_id}")

    # Send alerts
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
    new_concerts = []

    # 1. Artist website
    if user.get("monitor_websites", 1):
        try:
            tour_url = artist.get("tour_page_url")
            if not tour_url:
                tour_url = await find_tour_page_url(artist_name)
            if tour_url:
                page_text, page_hash = await scrape_tour_page(tour_url)
                if page_hash and page_hash != artist.get("last_tour_page_hash"):
                    await update_artist_tour_page(artist["id"], tour_url, page_hash)
                    found = extract_concerts_from_text(page_text, artist_name, locations)
                    for c in found:
                        if not is_future_date(c.get("event_date", "")):
                            continue
                        concert_type = classify_concert(c.get("raw_text", ""), c.get("event_title", ""))
                        concert = {
                            "user_id": user["id"], "artist_id": artist["spotify_artist_id"],
                            **c, "source": "website", "source_url": tour_url,
                            "concert_type": concert_type,
                        }
                        if await save_concert(concert):
                            new_concerts.append(concert)
        except Exception as e:
            logger.debug(f"Website scan failed for {artist_name}: {e}")

    # 2. Google News RSS
    if user.get("monitor_news", 1):
        try:
            news_results = await search_google_news(artist_name, locations)
            for item in news_results:
                if not is_future_date(item.get("event_date", "")):
                    continue
                concert_type = classify_concert(item.get("raw_text", ""), item.get("event_title", ""))
                concert = {
                    "user_id": user["id"], "artist_id": artist["spotify_artist_id"],
                    **item, "source": "news", "concert_type": concert_type,
                }
                if await save_concert(concert):
                    new_concerts.append(concert)
        except Exception as e:
            logger.debug(f"News scan failed for {artist_name}: {e}")

    # 3. Twitter/Nitter
    if user.get("monitor_twitter", 1):
        try:
            tweets = await search_twitter_public(artist_name)
            for item in tweets:
                concert_type = classify_concert(item.get("raw_text", ""), "")
                concert = {
                    "user_id": user["id"], "artist_id": artist["spotify_artist_id"],
                    **item, "source": "twitter", "concert_type": concert_type,
                }
                if await save_concert(concert):
                    new_concerts.append(concert)
        except Exception as e:
            logger.debug(f"Twitter scan failed for {artist_name}: {e}")

    if new_concerts:
        logger.info(f"  [{artist_name}] {len(new_concerts)} new alerts")
    return len(new_concerts)
