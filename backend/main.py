from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import uvicorn
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging

from routers import auth, artists, concerts, settings
from database import init_db
from monitor import run_monitoring_cycle

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    scheduler.add_job(
        run_monitoring_cycle,
        IntervalTrigger(hours=6),
        id="monitor",
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler started — monitoring every 6 hours")
    yield
    scheduler.shutdown()

app = FastAPI(
    title="Concert Radar API",
    description="Monitor Spotify followed artists for upcoming concerts",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(artists.router, prefix="/artists", tags=["artists"])
app.include_router(concerts.router, prefix="/concerts", tags=["concerts"])
app.include_router(settings.router, prefix="/settings", tags=["settings"])

@app.get("/")
async def root():
    return {"status": "Concert Radar API is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/trigger-scan")
async def trigger_scan(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_monitoring_cycle)
    return {"message": "Scan triggered"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
