import asyncio
import json
import logging
from datetime import datetime, timezone

from database import (
    get_all_users, get_user_artists, upsert_artists,
    update_artist_tour_page, save_concert, delete_duplicate_concerts,
    delete_past_concerts, reclassify_stale_presales,
    get_unnotified_concerts, mark_concerts_notified,
    log_activity, check_and_award_badges
)
from database import (
    get_saved_concerts_with_status_change, update_saved_concert_known_type,
    log_activity, award_badge, get_gamification_stats
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

    # Check for status changes on saved concerts and log activity
    try:
        changed = await get_saved_concerts_with_status_change(user_id)
        for c in changed:
            old_type = c.get("last_known_type", "")
            new_type = c.get("concert_type", "")
            artist = c.get("artist_name", "")
            type_labels = {
                "tour_announcement": "📢 Announced",
                "presale": "🔑 Presale",
                "ticket_sale": "🎟️ On Sale",
            }
            await log_activity(
                user_id, "status_changed",
                f"{artist} — {type_labels.get(new_type, new_type)}",
                f"Status changed from {type_labels.get(old_type, old_type)} to {type_labels.get(new_type, new_type)}",
                meta={"concert_id": c["id"], "old_type": old_type, "new_type": new_type}
            )
            await update_saved_concert_known_type(user_id, c["id"], new_type)

        # Award early bird badge if warranted
        stats = await get_gamification_stats(user_id)
        if stats["early_detections"] >= 5:
            await award_badge(user_id, "early_bird", "Early Bird",
                            "🐦", "Discovered 5+ shows before they hit Ticketmaster")
        if stats["going_count"] >= 3:
            await award_badge(user_id, "concert_goer", "Concert Goer",
                            "🎸", "Marked 3+ concerts as Going")
        if stats["cities_count"] >= 3:
            await award_badge(user_id, "road_tripper", "Road Tripper",
                            "🗺️", "Saved concerts in 3+ different cities")
    except Exception as e:
        logger.debug(f"Activity logging error: {e}")

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

