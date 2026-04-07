from fastapi import APIRouter, Request, HTTPException
import httpx
from routers.auth import get_current_user, refresh_spotify_token

router = APIRouter()

@router.get("/top-artists")
async def top_artists(request: Request, limit: int = 20, time_range: str = "medium_term"):
    user = await get_current_user(request)
    token = await refresh_spotify_token(user)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.spotify.com/v1/me/top/artists?limit={limit}&time_range={time_range}",
            headers={"Authorization": f"Bearer {token}"}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Failed to fetch top artists")
        data = resp.json()
        artists = [
            {
                "id": a["id"], "name": a["name"],
                "genres": a.get("genres", [])[:3],
                "image": a["images"][0]["url"] if a.get("images") else None,
                "popularity": a.get("popularity", 0),
            }
            for a in data.get("items", [])
        ]
        return {"artists": artists, "time_range": time_range}

@router.get("/top-tracks")
async def top_tracks(request: Request, limit: int = 20, time_range: str = "medium_term"):
    user = await get_current_user(request)
    token = await refresh_spotify_token(user)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.spotify.com/v1/me/top/tracks?limit={limit}&time_range={time_range}",
            headers={"Authorization": f"Bearer {token}"}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Failed to fetch top tracks")
        data = resp.json()
        tracks = [
            {
                "id": t["id"], "name": t["name"],
                "artist": t["artists"][0]["name"] if t.get("artists") else "",
                "album": t["album"]["name"] if t.get("album") else "",
                "image": t["album"]["images"][0]["url"] if t.get("album", {}).get("images") else None,
                "preview_url": t.get("preview_url"),
            }
            for t in data.get("items", [])
        ]
        return {"tracks": tracks, "time_range": time_range}

@router.get("/summary")
async def stats_summary(request: Request):
    user = await get_current_user(request)
    token = await refresh_spotify_token(user)

    async with httpx.AsyncClient() as client:
        artists_resp = await client.get(
            "https://api.spotify.com/v1/me/top/artists?limit=50&time_range=medium_term",
            headers={"Authorization": f"Bearer {token}"}
        )
        tracks_resp = await client.get(
            "https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=medium_term",
            headers={"Authorization": f"Bearer {token}"}
        )

    artists_data = artists_resp.json().get("items", []) if artists_resp.status_code == 200 else []
    tracks_data = tracks_resp.json().get("items", []) if tracks_resp.status_code == 200 else []

    # Tally genres
    genre_counts = {}
    for artist in artists_data:
        for genre in artist.get("genres", []):
            genre_counts[genre] = genre_counts.get(genre, 0) + 1
    top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    # Derive "scene" tag
    scene = derive_scene(top_genres)

    return {
        "top_artists": [
            {
                "id": a["id"], "name": a["name"],
                "image": a["images"][0]["url"] if a.get("images") else None,
                "genres": a.get("genres", [])[:2],
            }
            for a in artists_data[:10]
        ],
        "top_tracks": [
            {
                "id": t["id"], "name": t["name"],
                "artist": t["artists"][0]["name"] if t.get("artists") else "",
                "image": t["album"]["images"][0]["url"] if t.get("album", {}).get("images") else None,
            }
            for t in tracks_data[:10]
        ],
        "top_genres": [g[0] for g in top_genres],
        "scene": scene,
        "total_artists_followed": len(artists_data),
    }


def derive_scene(top_genres: list) -> str:
    genre_names = [g[0].lower() for g in top_genres]
    combined = " ".join(genre_names)

    if any(g in combined for g in ["hip hop", "rap", "trap", "drill"]):
        if any(g in combined for g in ["indie", "alternative", "rock"]):
            return "Hip-Hop · Indie Crossover"
        return "Hip-Hop · Rap"
    if any(g in combined for g in ["electronic", "edm", "house", "techno", "dance"]):
        return "Electronic · Dance"
    if any(g in combined for g in ["indie", "alternative"]):
        return "Indie · Alternative"
    if any(g in combined for g in ["pop"]):
        return "Pop · Mainstream"
    if any(g in combined for g in ["rock", "metal"]):
        return "Rock · Alternative"
    if any(g in combined for g in ["r&b", "soul", "funk"]):
        return "R&B · Soul"
    if any(g in combined for g in ["country", "folk", "americana"]):
        return "Folk · Country"
    if top_genres:
        return top_genres[0][0].title()
    return "Eclectic Listener"
