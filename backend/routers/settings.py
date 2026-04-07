from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional

from routers.auth import get_current_user
from database import update_user_settings

router = APIRouter()


class UserSettings(BaseModel):
    alert_email: Optional[str] = None
    location_override: Optional[str] = None
    radius_km: Optional[int] = None
    include_nearby_cities: Optional[bool] = None
    scan_frequency_hours: Optional[int] = None
    monitor_websites: Optional[bool] = None
    monitor_news: Optional[bool] = None
    monitor_twitter: Optional[bool] = None
    monitor_mailing_lists: Optional[bool] = None


@router.patch("/")
async def update_settings(request: Request, body: UserSettings):
    user = await get_current_user(request)
    updates = {k: v for k, v in body.dict().items() if v is not None}

    # Convert booleans to ints for SQLite
    for key in ["include_nearby_cities", "monitor_websites", "monitor_news",
                "monitor_twitter", "monitor_mailing_lists"]:
        if key in updates:
            updates[key] = int(updates[key])

    if updates:
        await update_user_settings(user["id"], updates)
    return {"message": "Settings updated", "updated": list(updates.keys())}
