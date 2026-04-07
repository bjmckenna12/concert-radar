from fastapi import APIRouter, Request, BackgroundTasks
from routers.auth import get_current_user
from database import get_user_concerts, delete_duplicate_concerts
from monitor import run_user_monitoring

router = APIRouter()

@router.get("/")
async def list_concerts(request: Request, limit: int = 100, ticket_sales_only: bool = False):
    user = await get_current_user(request)
    concerts = await get_user_concerts(user["id"], limit, ticket_sales_only)
    return {"concerts": concerts, "total": len(concerts)}

@router.post("/scan")
async def trigger_scan(request: Request, background_tasks: BackgroundTasks):
    user = await get_current_user(request)
    background_tasks.add_task(run_user_monitoring, user)
    return {"message": "Scan started"}

@router.post("/dedupe")
async def dedupe_concerts(request: Request):
    user = await get_current_user(request)
    await delete_duplicate_concerts(user["id"])
    return {"message": "Duplicates removed"}
