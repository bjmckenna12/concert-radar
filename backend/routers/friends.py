from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from routers.auth import get_current_user
from database import get_user_by_spotify_id, add_friend, get_friends, get_user_concerts, get_user_artists

router = APIRouter()

class AddFriendBody(BaseModel):
    spotify_id: str

@router.get("/")
async def list_friends(request: Request):
    user = await get_current_user(request)
    friends = await get_friends(user["id"])
    return {"friends": friends}

@router.post("/add")
async def add_friend_route(request: Request, body: AddFriendBody):
    user = await get_current_user(request)
    friend = await get_user_by_spotify_id(body.spotify_id)
    if not friend:
        raise HTTPException(status_code=404, detail="User not found. They need to sign up for Concert Radar first.")
    if friend["id"] == user["id"]:
        raise HTTPException(status_code=400, detail="You can't add yourself as a friend.")
    success = await add_friend(user["id"], friend["id"])
    if not success:
        raise HTTPException(status_code=400, detail="Already friends.")
    return {"message": f"Added {friend['display_name']} as a friend!"}

@router.get("/{friend_id}/concerts")
async def friend_concerts(request: Request, friend_id: str):
    await get_current_user(request)
    concerts = await get_user_concerts(friend_id, 20)
    return {"concerts": concerts}

@router.get("/{friend_id}/artists")
async def friend_artists(request: Request, friend_id: str):
    await get_current_user(request)
    artists = await get_user_artists(friend_id)
    return {"artists": artists[:20]}
