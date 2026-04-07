from fastapi import APIRouter, Request, HTTPException
import httpx

from routers.auth import get_current_user, refresh_spotify_token
from database import upsert_artists, get_user_artists

router = APIRouter()

SPOTIFY_FOLLOWING_URL = "https://api.spotify.com/v1/me/following"


async def fetch_all_followed_artists(access_token: str) -> list:
    artists = []
    params = {"type": "artist", "limit": 50}
    url = SPOTIFY_FOLLOWING_URL

    async with httpx.AsyncClient() as client:
        while url:
            resp = await client.get(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
                params=params if url == SPOTIFY_FOLLOWING_URL else {}
            )
            if resp.status_code == 401:
                raise HTTPException(status_code=401, detail="Spotify token invalid")
            if resp.status_code != 200:
                break

            data = resp.json()
            artists_page = data.get("artists", {})
            items = artists_page.get("items", [])
            artists.extend([{"id": a["id"], "name": a["name"]} for a in items])
            url = artists_page.get("next")
            params = {}

    return artists


@router.get("/sync")
async def sync_artists(request: Request):
    user = await get_current_user(request)
    access_token = await refresh_spotify_token(user)
    artists = await fetch_all_followed_artists(access_token)
    if artists:
        await upsert_artists(user["id"], artists)
    return {"synced": len(artists), "artists": artists[:10]}  # preview first 10


@router.get("/")
async def list_artists(request: Request):
    user = await get_current_user(request)
    artists = await get_user_artists(user["id"])
    return {"artists": artists, "total": len(artists)}
