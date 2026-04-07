import asyncio
import logging
from datetime import datetime

from database import (
    get_all_users, get_user_artists, upsert_artists,
    update_artist_tour_page, save_concert,
    get_unnotified_concerts, mark_concerts_notified
)
from scraper import (
    find_tour_page_url, scrape_tour_page, extract_concerts_from_text,
    search_google_news, search_twitter_public
)
from notifier import send_alert_email
from geolocation import get_search_locations, detect_location
from routers.auth import refresh_spotify_token
from routers.artists import fetch_all_followed_artists

logger = logging.getLogger(__name__)


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

    # Refresh Spotify artists
    try:
        access_token = await refresh_spotify_token(user)
        artists = await fetch_all_followed_artists(access_token)
        if artists:
            await upsert_artists(user_id, artists)
            logger.info(f"Synced {len(artists)} artists for {user_id}")
    except Exception as e:
        logger.warning(f"Failed to sync Spotify artists for {user_id}: {e}")

    # Get location context (use override if set, else default to AU)
    if user.get("location_override"):
        search_locations = [user["location_override"]]
        # Add nearby cities if Tasmania
        loc_lower = user["location_override"].lower()
        if any(k in loc_lower for k in ["tasmania", "hobart", "launceston"]) and user.get("include_nearby_cities"):
            search_locations += ["Melbourne", "Sydney"]
    else:
        # Default to broad AU search if no IP context available during background job
        search_locations = ["Australia", "Melbourne", "Sydney", "Brisbane", "Perth", "Adelaide", "Hobart"]

    logger.info(f"Searching locations: {search_locations}")

    # Get artists from DB
    db_artists = await get_user_artists(user_id)
    total_new = 0

    for artist in db_artists:
        new_count = await scan_artist(user, artist, search_locations)
        total_new += new_count
        # Rate limit — be nice to websites
        await asyncio.sleep(1.5)

    logger.info(f"Found {total_new} new concerts for user {user_id}")

    # Send email alert if there are unnotified concerts
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
                logger.info(f"Sent alert for {len(unnotified)} concerts to {user['alert_email']}")
    else:
        logger.info(f"No alert_email set for user {user_id} — skipping notification")


async def scan_artist(user: dict, artist: dict, locations: list) -> int:
    """Scan all sources for a single artist. Returns count of new concerts found."""
    artist_name = artist["artist_name"]
    new_concerts = []

    # 1. Scrape artist website
    if user.get("monitor_websites", 1):
        try:
            tour_url = artist.get("tour_page_url")
            if not tour_url:
                tour_url = await find_tour_page_url(artist_name)

            if tour_url:
                page_text, page_hash = await scrape_tour_page(tour_url)

                # Only process if page has changed
                if page_hash and page_hash != artist.get("last_tour_page_hash"):
                    await update_artist_tour_page(artist["id"], tour_url, page_hash)
                    found = extract_concerts_from_text(page_text, artist_name, locations)
                    for c in found:
                        concert = {
                            "user_id": user["id"],
                            "artist_id": artist["spotify_artist_id"],
                            **c,
                            "source": "website",
                            "source_url": tour_url,
                        }
                        is_new = await save_concert(concert)
                        if is_new:
                            new_concerts.append(concert)
        except Exception as e:
            logger.debug(f"Website scan failed for {artist_name}: {e}")

    # 2. Google News RSS
    if user.get("monitor_news", 1):
        try:
            news_results = await search_google_news(artist_name, locations)
            for item in news_results:
                concert = {
                    "user_id": user["id"],
                    "artist_id": artist["spotify_artist_id"],
                    **item,
                    "source": "news",
                }
                is_new = await save_concert(concert)
                if is_new:
                    new_concerts.append(concert)
        except Exception as e:
            logger.debug(f"News scan failed for {artist_name}: {e}")

    # 3. Twitter/X (via Nitter)
    if user.get("monitor_twitter", 1):
        try:
            tweets = await search_twitter_public(artist_name)
            for item in tweets:
                concert = {
                    "user_id": user["id"],
                    "artist_id": artist["spotify_artist_id"],
                    **item,
                    "source": "twitter",
                }
                is_new = await save_concert(concert)
                if is_new:
                    new_concerts.append(concert)
        except Exception as e:
            logger.debug(f"Twitter scan failed for {artist_name}: {e}")

    if new_concerts:
        logger.info(f"  [{artist_name}] {len(new_concerts)} new alerts")

    return len(new_concerts)
