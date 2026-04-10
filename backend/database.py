import aiosqlite
import json
import os
from datetime import datetime

DB_PATH = os.getenv("DB_PATH", "concert_radar.db")

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        # Users
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                spotify_id TEXT UNIQUE NOT NULL,
                display_name TEXT,
                email TEXT,
                access_token TEXT,
                refresh_token TEXT,
                token_expires_at INTEGER,
                alert_email TEXT,
                location_override TEXT,
                radius_km INTEGER DEFAULT 80,
                include_nearby_cities INTEGER DEFAULT 1,
                scan_frequency_hours INTEGER DEFAULT 6,
                monitor_websites INTEGER DEFAULT 1,
                monitor_news INTEGER DEFAULT 1,
                monitor_twitter INTEGER DEFAULT 1,
                monitor_mailing_lists INTEGER DEFAULT 0,
                favorite_cities TEXT DEFAULT '[]',
                friends TEXT DEFAULT '[]',
                profile_public INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Monitored artists
        await db.execute("""
            CREATE TABLE IF NOT EXISTS monitored_artists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                spotify_artist_id TEXT NOT NULL,
                artist_name TEXT NOT NULL,
                tour_page_url TEXT,
                last_tour_page_hash TEXT,
                last_scanned_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, spotify_artist_id)
            )
        """)
        # Detected concerts
        await db.execute("""
            CREATE TABLE IF NOT EXISTS detected_concerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                artist_id TEXT NOT NULL,
                artist_name TEXT NOT NULL,
                event_title TEXT,
                venue TEXT,
                city TEXT,
                country TEXT,
                event_date TEXT,
                source TEXT,
                source_url TEXT,
                raw_text TEXT,
                concert_type TEXT DEFAULT 'unknown',
                price TEXT DEFAULT '',
                presale_end_date TEXT DEFAULT '',
                notified INTEGER DEFAULT 0,
                detected_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, artist_id, venue, event_date, source)
            )
        """)
        # Saved concerts (watchlist)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS saved_concerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                concert_id INTEGER NOT NULL,
                status TEXT DEFAULT 'interested',
                saved_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (concert_id) REFERENCES detected_concerts(id),
                UNIQUE(user_id, concert_id)
            )
        """)
        # Activity log
        await db.execute("""
            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                artist_name TEXT,
                concert_id INTEGER,
                detail TEXT,
                detected_early_days INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Badges / achievements
        await db.execute("""
            CREATE TABLE IF NOT EXISTS user_badges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                badge_key TEXT NOT NULL,
                badge_name TEXT NOT NULL,
                badge_emoji TEXT,
                awarded_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, badge_key)
            )
        """)
        # Friends
        await db.execute("""
            CREATE TABLE IF NOT EXISTS friends (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                friend_id TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, friend_id)
            )
        """)
        # TM cache
        await db.execute("""
            CREATE TABLE IF NOT EXISTS tm_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                artist_name TEXT NOT NULL,
                results TEXT NOT NULL,
                cached_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(artist_name)
            )
        """)
        # Scan log
        await db.execute("""
            CREATE TABLE IF NOT EXISTS scan_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                scanned_at TEXT DEFAULT CURRENT_TIMESTAMP,
                artists_scanned INTEGER DEFAULT 0,
                concerts_found INTEGER DEFAULT 0,
                alerts_sent INTEGER DEFAULT 0,
                errors TEXT
            )
        """)

        # Migrations — add columns to existing tables
        concert_cols = [
            ("concert_type", "TEXT DEFAULT 'unknown'"),
            ("price", "TEXT DEFAULT ''"),
            ("presale_end_date", "TEXT DEFAULT ''"),
        ]
        for col, defn in concert_cols:
            try:
                await db.execute(f"ALTER TABLE detected_concerts ADD COLUMN {col} {defn}")
            except Exception:
                pass

        user_cols = [
            ("favorite_cities", "TEXT DEFAULT '[]'"),
            ("friends", "TEXT DEFAULT '[]'"),
            ("profile_public", "INTEGER DEFAULT 1"),
        ]
        for col, defn in user_cols:
            try:
                await db.execute(f"ALTER TABLE users ADD COLUMN {col} {defn}")
            except Exception:
                pass

        await db.commit()


# ─── User functions ───────────────────────────────────────────────────────────

async def get_user(user_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM users WHERE id = ?", (user_id,)) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None

async def get_user_by_spotify_id(spotify_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM users WHERE spotify_id = ?", (spotify_id,)) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None

async def upsert_user(user_data: dict):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO users (id, spotify_id, display_name, email, access_token, refresh_token, token_expires_at)
            VALUES (:id, :spotify_id, :display_name, :email, :access_token, :refresh_token, :token_expires_at)
            ON CONFLICT(spotify_id) DO UPDATE SET
                display_name = excluded.display_name,
                email = excluded.email,
                access_token = excluded.access_token,
                refresh_token = excluded.refresh_token,
                token_expires_at = excluded.token_expires_at
        """, user_data)
        await db.commit()

async def update_user_settings(user_id: str, settings: dict):
    fields = ", ".join(f"{k} = :{k}" for k in settings.keys())
    settings["id"] = user_id
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE users SET {fields} WHERE id = :id", settings)
        await db.commit()

async def get_all_users():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM users") as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

async def get_user_by_username(username: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM users WHERE spotify_id = ? OR display_name = ?",
            (username, username)
        ) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


# ─── Artist functions ─────────────────────────────────────────────────────────

async def upsert_artists(user_id: str, artists: list):
    async with aiosqlite.connect(DB_PATH) as db:
        for artist in artists:
            await db.execute("""
                INSERT INTO monitored_artists (user_id, spotify_artist_id, artist_name)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id, spotify_artist_id) DO UPDATE SET artist_name = excluded.artist_name
            """, (user_id, artist["id"], artist["name"]))
        await db.commit()

async def get_user_artists(user_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM monitored_artists WHERE user_id = ?", (user_id,)
        ) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

async def update_artist_tour_page(artist_db_id: int, url: str, page_hash: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            UPDATE monitored_artists SET tour_page_url = ?, last_tour_page_hash = ?, last_scanned_at = ?
            WHERE id = ?
        """, (url, page_hash, datetime.utcnow().isoformat(), artist_db_id))
        await db.commit()


# ─── Concert functions ────────────────────────────────────────────────────────

async def save_concert(concert: dict) -> bool:
    """Returns True if new. Also logs to activity_log."""
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            concert.setdefault("price", "")
            concert.setdefault("presale_end_date", "")
            # Use INSERT OR IGNORE with a more specific key
            # Include source_url in uniqueness so same artist/date from diff sources both save
            await db.execute("""
                INSERT OR IGNORE INTO detected_concerts
                (user_id, artist_id, artist_name, event_title, venue, city, country,
                 event_date, source, source_url, raw_text, concert_type, price, presale_end_date)
                VALUES (:user_id, :artist_id, :artist_name, :event_title, :venue, :city,
                        :country, :event_date, :source, :source_url, :raw_text, :concert_type,
                        :price, :presale_end_date)
            """, concert)
            await db.commit()
            # Check if actually inserted (rowcount = 0 means it was a duplicate)
            return True
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"save_concert error: {e} — {concert.get('artist_name')} {concert.get('event_date')}")
            return False

async def get_user_concerts(user_id: str, limit: int = 200, ticket_sales_only: bool = False):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        if ticket_sales_only:
            query = """SELECT * FROM detected_concerts
                       WHERE user_id = ? AND concert_type IN ('ticket_sale', 'presale')
                       ORDER BY event_date ASC, detected_at DESC LIMIT ?"""
        else:
            query = """SELECT * FROM detected_concerts
                       WHERE user_id = ?
                       ORDER BY detected_at DESC LIMIT ?"""
        async with db.execute(query, (user_id, limit)) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

async def get_deduplicated_concerts(user_id: str) -> list:
    """
    Return concerts with dedup logic applied:
    - If an artist has a ticket_sale, suppress presale and announcement for that artist
    - If an artist has a presale but no ticket_sale, suppress announcement
    - One artist = one status = most actionable wins
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT * FROM detected_concerts WHERE user_id = ?
            ORDER BY
                CASE concert_type
                    WHEN 'ticket_sale' THEN 1
                    WHEN 'presale' THEN 2
                    WHEN 'tour_announcement' THEN 3
                    ELSE 4
                END,
                event_date ASC
        """, (user_id,)) as cur:
            rows = [dict(r) for r in await cur.fetchall()]

    # Apply artist-level dedup: best status per artist wins
    seen_artists = {}
    result = []
    for c in rows:
        artist_id = c.get("artist_id", "")
        ctype = c.get("concert_type", "unknown")
        if artist_id not in seen_artists:
            seen_artists[artist_id] = ctype
            result.append(c)
        else:
            existing_type = seen_artists[artist_id]
            # Allow multiple shows of the same type (different dates/venues)
            if ctype == existing_type:
                result.append(c)
            # Only upgrade type, never downgrade
            # e.g. if we already have ticket_sale, skip presale/announcement for this artist
            elif ctype == "ticket_sale" and existing_type != "ticket_sale":
                # Remove previous lower-priority entries for this artist
                result = [r for r in result if r.get("artist_id") != artist_id]
                seen_artists[artist_id] = ctype
                result.append(c)
    return result

async def delete_duplicate_concerts(user_id: str):
    """Remove exact duplicates (same artist + date + venue)."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            DELETE FROM detected_concerts
            WHERE id NOT IN (
                SELECT MAX(id) FROM detected_concerts
                WHERE user_id = ?
                AND event_date IS NOT NULL AND event_date != ''
                AND venue IS NOT NULL AND venue != ''
                GROUP BY user_id, artist_id, DATE(event_date), venue
            ) AND user_id = ?
            AND event_date IS NOT NULL AND event_date != ''
            AND venue IS NOT NULL AND venue != ''
        """, (user_id, user_id))
        await db.commit()

async def reclassify_stale_presales(user_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            UPDATE detected_concerts SET concert_type = 'ticket_sale'
            WHERE user_id = ? AND concert_type = 'presale'
            AND presale_end_date != '' AND presale_end_date IS NOT NULL
            AND datetime(presale_end_date) < datetime('now')
        """, (user_id,))
        await db.execute("""
            UPDATE detected_concerts SET concert_type = 'ticket_sale'
            WHERE user_id = ? AND concert_type = 'presale'
            AND (presale_end_date = '' OR presale_end_date IS NULL)
            AND datetime(detected_at) < datetime('now', '-14 days')
        """, (user_id,))
        await db.commit()

async def delete_past_concerts(user_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            DELETE FROM detected_concerts
            WHERE user_id = ? AND event_date != '' AND event_date IS NOT NULL
            AND source NOT IN ('news', 'twitter')
            AND DATE(event_date) < DATE('now')
        """, (user_id,))
        await db.execute("""
            DELETE FROM detected_concerts
            WHERE user_id = ? AND concert_type = 'cancelled'
        """, (user_id,))
        await db.commit()

async def get_unnotified_concerts(user_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM detected_concerts WHERE user_id = ? AND notified = 0 ORDER BY detected_at DESC",
            (user_id,)
        ) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

async def mark_concerts_notified(concert_ids: list):
    async with aiosqlite.connect(DB_PATH) as db:
        placeholders = ",".join("?" * len(concert_ids))
        await db.execute(
            f"UPDATE detected_concerts SET notified = 1 WHERE id IN ({placeholders})",
            concert_ids
        )
        await db.commit()


# ─── Saved concerts (watchlist) ───────────────────────────────────────────────

async def save_concert_to_watchlist(user_id: str, concert_id: int, status: str = "interested") -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            await db.execute("""
                INSERT INTO saved_concerts (user_id, concert_id, status)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id, concert_id) DO UPDATE SET status = excluded.status
            """, (user_id, concert_id, status))
            await db.commit()
            return True
        except Exception:
            return False

async def unsave_concert(user_id: str, concert_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "DELETE FROM saved_concerts WHERE user_id = ? AND concert_id = ?",
            (user_id, concert_id)
        )
        await db.commit()

async def get_saved_concerts(user_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT dc.*, sc.status as save_status, sc.saved_at
            FROM saved_concerts sc
            JOIN detected_concerts dc ON sc.concert_id = dc.id
            WHERE sc.user_id = ?
            ORDER BY dc.event_date ASC
        """, (user_id,)) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

async def get_saved_concert_ids(user_id: str) -> set:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT concert_id FROM saved_concerts WHERE user_id = ?", (user_id,)
        ) as cur:
            rows = await cur.fetchall()
            return {r[0] for r in rows}

async def get_friends_interested(concert_id: int, user_id: str) -> int:
    """Count how many friends have saved this concert."""
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("""
            SELECT COUNT(*) FROM saved_concerts sc
            JOIN friends f ON sc.user_id = f.friend_id
            WHERE f.user_id = ? AND sc.concert_id = ?
        """, (user_id, concert_id)) as cur:
            row = await cur.fetchone()
            return row[0] if row else 0


# ─── Activity log ─────────────────────────────────────────────────────────────

async def log_activity(user_id: str, event_type: str, artist_name: str = "",
                       concert_id: int = None, detail: str = "", detected_early_days: int = 0):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO activity_log (user_id, event_type, artist_name, concert_id, detail, detected_early_days)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, event_type, artist_name, concert_id, detail, detected_early_days))
        await db.commit()

async def get_activity_log(user_id: str, limit: int = 50):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT * FROM activity_log WHERE user_id = ?
            ORDER BY created_at DESC LIMIT ?
        """, (user_id, limit)) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]


# ─── Badges ───────────────────────────────────────────────────────────────────

BADGE_DEFINITIONS = {
    "early_bird_1":    {"name": "Early Bird",        "emoji": "🐦", "desc": "Detected 1 show before Ticketmaster"},
    "early_bird_5":    {"name": "Signal Hunter",     "emoji": "📡", "desc": "Detected 5 shows before Ticketmaster"},
    "early_bird_10":   {"name": "Radar Pro",         "emoji": "🚀", "desc": "Detected 10 shows before Ticketmaster"},
    "presale_hunter":  {"name": "Presale Hunter",    "emoji": "🔑", "desc": "Claimed 5 presales"},
    "world_traveller": {"name": "World Traveller",   "emoji": "✈️", "desc": "Concerts in 3+ countries"},
    "superfan":        {"name": "Superfan",          "emoji": "⭐", "desc": "Saved 10+ concerts"},
    "first_save":      {"name": "Watchlisted",       "emoji": "👀", "desc": "Saved your first concert"},
    "streak_3":        {"name": "On a Roll",         "emoji": "🔥", "desc": "Artist streak: 3 tours"},
}

async def award_badge(user_id: str, badge_key: str) -> bool:
    if badge_key not in BADGE_DEFINITIONS:
        return False
    badge = BADGE_DEFINITIONS[badge_key]
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            await db.execute("""
                INSERT INTO user_badges (user_id, badge_key, badge_name, badge_emoji)
                VALUES (?, ?, ?, ?)
            """, (user_id, badge_key, badge["name"], badge["emoji"]))
            await db.commit()
            return True
        except aiosqlite.IntegrityError:
            return False  # Already awarded

async def get_user_badges(user_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM user_badges WHERE user_id = ? ORDER BY awarded_at DESC",
            (user_id,)
        ) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

async def check_and_award_badges(user_id: str):
    """Check all badge conditions and award any newly earned badges."""
    # Count saved concerts
    saved = await get_saved_concerts(user_id)
    if len(saved) >= 1:
        await award_badge(user_id, "first_save")
    if len(saved) >= 10:
        await award_badge(user_id, "superfan")

    # Count early detections from activity log
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("""
            SELECT COUNT(*) FROM activity_log
            WHERE user_id = ? AND event_type = 'detected_early' AND detected_early_days > 0
        """, (user_id,)) as cur:
            row = await cur.fetchone()
            early_count = row[0] if row else 0

    if early_count >= 1:
        await award_badge(user_id, "early_bird_1")
    if early_count >= 5:
        await award_badge(user_id, "early_bird_5")
    if early_count >= 10:
        await award_badge(user_id, "early_bird_10")

    # Count countries
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("""
            SELECT COUNT(DISTINCT country) FROM detected_concerts
            WHERE user_id = ? AND country != ''
        """, (user_id,)) as cur:
            row = await cur.fetchone()
            country_count = row[0] if row else 0
    if country_count >= 3:
        await award_badge(user_id, "world_traveller")


# ─── Gamification scores ──────────────────────────────────────────────────────

async def get_user_stats(user_id: str) -> dict:
    """Compute gamification stats for a user."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        async with db.execute(
            "SELECT COUNT(*) as total FROM detected_concerts WHERE user_id = ?", (user_id,)
        ) as cur:
            total_concerts = (await cur.fetchone())["total"]

        async with db.execute(
            "SELECT COUNT(*) as total FROM saved_concerts WHERE user_id = ?", (user_id,)
        ) as cur:
            saved_count = (await cur.fetchone())["total"]

        async with db.execute("""
            SELECT COUNT(*) as total FROM activity_log
            WHERE user_id = ? AND event_type = 'detected_early'
        """, (user_id,)) as cur:
            early_detections = (await cur.fetchone())["total"]

        async with db.execute("""
            SELECT COUNT(DISTINCT country) as total FROM detected_concerts
            WHERE user_id = ? AND country != ''
        """, (user_id,)) as cur:
            countries = (await cur.fetchone())["total"]

    badges = await get_user_badges(user_id)

    # Simple radar score: weighted combo
    radar_score = (early_detections * 10) + (saved_count * 3) + (total_concerts * 1) + (countries * 5)

    return {
        "total_concerts_detected": total_concerts,
        "saved_count": saved_count,
        "early_detections": early_detections,
        "countries_covered": countries,
        "badges": badges,
        "radar_score": radar_score,
    }


# ─── Friends ──────────────────────────────────────────────────────────────────

async def add_friend(user_id: str, friend_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            await db.execute(
                "INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'active')",
                (user_id, friend_id)
            )
            await db.commit()
            return True
        except aiosqlite.IntegrityError:
            return False

async def get_friends(user_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT u.id, u.display_name, u.spotify_id
            FROM friends f JOIN users u ON f.friend_id = u.id
            WHERE f.user_id = ? AND f.status = 'active'
        """, (user_id,)) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

async def get_user_public_profile(user_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, display_name, spotify_id, profile_public FROM users WHERE id = ?",
            (user_id,)
        ) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


# ─── TM cache ─────────────────────────────────────────────────────────────────

async def get_tm_cache(artist_name: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT results FROM tm_cache
            WHERE artist_name = ?
            AND datetime(cached_at) > datetime('now', '-12 hours')
        """, (artist_name,)) as cur:
            row = await cur.fetchone()
            if row:
                return json.loads(row["results"])
    return None

async def set_tm_cache(artist_name: str, results: list):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO tm_cache (artist_name, results)
            VALUES (?, ?)
            ON CONFLICT(artist_name) DO UPDATE SET
                results = excluded.results,
                cached_at = CURRENT_TIMESTAMP
        """, (artist_name, json.dumps(results)))
        await db.commit()
