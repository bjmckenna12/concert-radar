import aiosqlite
import json
import os
from datetime import datetime

DB_PATH = os.getenv("DB_PATH", "concert_radar.db")

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
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
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
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
                notified INTEGER DEFAULT 0,
                detected_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, artist_id, venue, event_date)
            )
        """)
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
        await db.commit()

async def get_db():
    return aiosqlite.connect(DB_PATH)

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

async def save_concert(concert: dict) -> bool:
    """Returns True if this is a new concert (not a duplicate)"""
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            await db.execute("""
                INSERT INTO detected_concerts
                (user_id, artist_id, artist_name, event_title, venue, city, country, event_date, source, source_url, raw_text)
                VALUES (:user_id, :artist_id, :artist_name, :event_title, :venue, :city, :country, :event_date, :source, :source_url, :raw_text)
            """, concert)
            await db.commit()
            return True
        except aiosqlite.IntegrityError:
            return False

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

async def get_user_concerts(user_id: str, limit: int = 50):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM detected_concerts WHERE user_id = ? ORDER BY detected_at DESC LIMIT ?",
            (user_id, limit)
        ) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]
