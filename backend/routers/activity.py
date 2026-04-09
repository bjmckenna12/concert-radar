from fastapi import APIRouter, Request
from routers.auth import get_current_user
from database import get_activity_log, get_user_badges, get_user_stats, BADGE_DEFINITIONS

router = APIRouter()

@router.get("/")
async def list_activity(request: Request, limit: int = 50):
    user = await get_current_user(request)
    activities = await get_activity_log(user["id"], limit)
    return {"activities": activities, "total": len(activities)}

@router.get("/badges")
async def list_badges(request: Request):
    user = await get_current_user(request)
    badges = await get_user_badges(user["id"])
    return {"badges": badges, "all_badges": BADGE_DEFINITIONS}

@router.get("/stats")
async def gamification_stats(request: Request):
    user = await get_current_user(request)
    stats = await get_user_stats(user["id"])
    return stats
