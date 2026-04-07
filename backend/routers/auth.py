from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
import httpx
import uuid
import time
import hashlib
from urllib.parse import urlencode

from config import (
    SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI,
    SPOTIFY_SCOPES, FRONTEND_URL, SECRET_KEY
)
from database import upsert_user, get_user_by_spotify_id, get_user
import jwt as pyjwt

router = APIRouter()

SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_ME_URL = "https://api.spotify.com/v1/me"


def create_jwt(user_id: str) -> str:
    payload = {"sub": user_id, "iat": int(time.time()), "exp": int(time.time()) + 86400 * 30}
    return pyjwt.encode(payload, SECRET_KEY, algorithm="HS256")


def verify_jwt(token: str) -> str:
    try:
        payload = pyjwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload["sub"]
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")
    token = auth_header.split(" ", 1)[1]
    user_id = verify_jwt(token)
    user = await get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/login")
async def spotify_login():
    if not SPOTIFY_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Spotify credentials not configured")
    params = {
        "client_id": SPOTIFY_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": SPOTIFY_REDIRECT_URI,
        "scope": SPOTIFY_SCOPES,
        "show_dialog": "false"
    }
    url = f"{SPOTIFY_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url)


@router.get("/callback")
async def spotify_callback(code: str = None, error: str = None):
    if error:
        return RedirectResponse(f"{FRONTEND_URL}?error={error}")
    if not code:
        return RedirectResponse(f"{FRONTEND_URL}?error=no_code")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            SPOTIFY_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": SPOTIFY_REDIRECT_URI,
            },
            auth=(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET),
        )
        if token_resp.status_code != 200:
            return RedirectResponse(f"{FRONTEND_URL}?error=token_failed")

        tokens = token_resp.json()
        access_token = tokens["access_token"]
        refresh_token = tokens.get("refresh_token", "")
        expires_at = int(time.time()) + tokens.get("expires_in", 3600)

        me_resp = await client.get(
            SPOTIFY_ME_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if me_resp.status_code != 200:
            return RedirectResponse(f"{FRONTEND_URL}?error=profile_failed")

        profile = me_resp.json()
        spotify_id = profile["id"]
        existing = await get_user_by_spotify_id(spotify_id)
        user_id = existing["id"] if existing else str(uuid.uuid4())

        await upsert_user({
            "id": user_id,
            "spotify_id": spotify_id,
            "display_name": profile.get("display_name", ""),
            "email": profile.get("email", ""),
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_expires_at": expires_at,
        })

        jwt_token = create_jwt(user_id)
        return RedirectResponse(f"{FRONTEND_URL}?token={jwt_token}")


async def refresh_spotify_token(user: dict) -> str:
    """Refresh access token if expired, return valid token."""
    if int(time.time()) < user.get("token_expires_at", 0) - 60:
        return user["access_token"]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            SPOTIFY_TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": user["refresh_token"],
            },
            auth=(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET),
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Failed to refresh Spotify token")

        tokens = resp.json()
        from database import update_user_settings
        await update_user_settings(user["id"], {
            "access_token": tokens["access_token"],
            "token_expires_at": int(time.time()) + tokens.get("expires_in", 3600),
        })
        return tokens["access_token"]


@router.get("/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {
        "id": user["id"],
        "spotify_id": user["spotify_id"],
        "display_name": user["display_name"],
        "email": user["email"],
        "alert_email": user["alert_email"],
        "location_override": user["location_override"],
        "radius_km": user["radius_km"],
        "scan_frequency_hours": user["scan_frequency_hours"],
        "include_nearby_cities": bool(user["include_nearby_cities"]),
        "monitor_websites": bool(user["monitor_websites"]),
        "monitor_news": bool(user["monitor_news"]),
        "monitor_twitter": bool(user["monitor_twitter"]),
    }
