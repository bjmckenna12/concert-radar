from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from routers.auth import get_current_user
from database import (
    save_concert_to_watchlist, unsave_concert,
    get_saved_concerts, get_saved_concert_ids,
    check_and_award_badges, log_activity
)

router = APIRouter()

class SaveBody(BaseModel):
    concert_id: int
    status: str = "interested"  # interested | going

@router.post("/")
async def save_concert_route(request: Request, body: SaveBody):
    user = await get_current_user(request)
    if body.status not in ("interested", "going"):
        raise HTTPException(status_code=400, detail="Status must be 'interested' or 'going'")
    success = await save_concert_to_watchlist(user["id"], body.concert_id, body.status)
    await log_activity(user["id"], "saved_concert", detail=f"status:{body.status}", concert_id=body.concert_id)
    await check_and_award_badges(user["id"])
    return {"message": "Saved", "status": body.status}

@router.delete("/{concert_id}")
async def unsave_concert_route(request: Request, concert_id: int):
    user = await get_current_user(request)
    await unsave_concert(user["id"], concert_id)
    return {"message": "Removed from watchlist"}

@router.get("/")
async def list_saved(request: Request):
    user = await get_current_user(request)
    saved = await get_saved_concerts(user["id"])
    return {"saved": saved, "total": len(saved)}

@router.get("/ids")
async def saved_ids(request: Request):
    user = await get_current_user(request)
    ids = await get_saved_concert_ids(user["id"])
    return {"ids": list(ids)}
