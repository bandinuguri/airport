import sys
import asyncio

# CRITICAL: Windows event loop policy MUST be set BEFORE any asyncio operations
# This fixes NotImplementedError with Playwright subprocess on Windows
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import os
import json
import time

from typing import List
from fastapi import FastAPI, Body, Request, Query
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from scraper import scrape_airport_weather
from database import save_weather_snapshot, get_all_snapshots, get_snapshot_data, get_airport_history
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("api.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("weather_app")

app = FastAPI()

# -----------------------------------------------------------------------------
# Shared (server-side) weather cache
# -----------------------------------------------------------------------------
WEATHER_CACHE_TTL_SECONDS = 10 * 60
AUTO_REFRESH_ENABLED = os.getenv("AUTO_REFRESH_ENABLED", "1") not in ("0", "false", "False")
AUTO_REFRESH_INTERVAL_SECONDS = int(os.getenv("AUTO_REFRESH_INTERVAL_SECONDS", str(WEATHER_CACHE_TTL_SECONDS)))
_weather_cache_lock = asyncio.Lock()
_weather_cache = {
    "fetched_at": 0.0,          # monotonic-ish epoch seconds
    "last_updated": None,       # ISO string
    "data": None,               # scraped list
}

async def _refresh_weather_cache() -> bool:
    """
    캐시를 실제로 갱신 시도합니다(싱글 플라이트).
    성공하면 True, 실패하면 False.
    """
    now = time.time()
    async with _weather_cache_lock:
        try:
            data = await scrape_airport_weather()
            _weather_cache["data"] = data
            _weather_cache["fetched_at"] = now
            _weather_cache["last_updated"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))
            logger.info("Weather cache refreshed (items=%s)", len(data) if data else 0)
            return True
        except Exception:
            logger.exception("Weather cache refresh failed")
            return False

async def _auto_refresh_loop():
    """
    서버 백그라운드에서 주기적으로 캐시 갱신.
    - 프로세스 기반(uvicorn 등)에서만 안정적으로 동작
    - 서버리스(Vercel Functions 등)에서는 보장되지 않음
    """
    # startup 직후 1회 워밍업(요청 전 최신값 준비)
    await asyncio.sleep(1)
    await _refresh_weather_cache()

    while True:
        await asyncio.sleep(AUTO_REFRESH_INTERVAL_SECONDS)
        # TTL 기반으로만 갱신(불필요한 스크래핑 방지)
        now = time.time()
        async with _weather_cache_lock:
            fetched_at = float(_weather_cache.get("fetched_at") or 0.0)
            age = (now - fetched_at) if fetched_at else None
            should_refresh = (age is None) or (age >= WEATHER_CACHE_TTL_SECONDS)

        if should_refresh:
            await _refresh_weather_cache()

@app.on_event("startup")
async def _startup():
    if AUTO_REFRESH_ENABLED:
        # background task 등록
        app.state.weather_refresh_task = asyncio.create_task(_auto_refresh_loop())
        logger.info("Auto refresh enabled (interval=%ss, ttl=%ss)", AUTO_REFRESH_INTERVAL_SECONDS, WEATHER_CACHE_TTL_SECONDS)
    else:
        logger.info("Auto refresh disabled")

@app.on_event("shutdown")
async def _shutdown():
    task = getattr(app.state, "weather_refresh_task", None)
    if task:
        task.cancel()
        try:
            await task
        except Exception:
            pass

# CORS 설정 (개발 환경용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files from dist directory
if os.path.exists("dist"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

# Serve index.html for root and SPA routes
@app.get("/")
async def read_root():
    index_path = os.path.join("dist", "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="Build not found. Run 'npm run build' first.", status_code=404)

# Legacy backend data view
@app.get("/data", response_class=HTMLResponse)
async def read_data_view():
    if os.path.exists("data.html"):
        with open("data.html", "r", encoding="utf-8") as f:
            return f.read()
    return HTMLResponse(content="Data view not found.", status_code=404)

@app.get("/api/weather")
async def get_weather(force: bool = Query(False)):
    """
    공용 캐시 기반 기상 데이터.
    - 기본: 캐시가 10분 이내면 캐시 반환
    - force=true: 캐시가 10분 이내면 갱신 거부(캐시 반환), 10분이 지났으면 갱신 시도
    """
    now = time.time()

    async with _weather_cache_lock:
        cached_data = _weather_cache.get("data")
        fetched_at = float(_weather_cache.get("fetched_at") or 0.0)
        last_updated = _weather_cache.get("last_updated")
        age = now - fetched_at if fetched_at else None

        cache_fresh = bool(cached_data) and age is not None and age < WEATHER_CACHE_TTL_SECONDS

        # If cache is fresh, return it (even if force requested; we enforce 10-min refresh rule)
        if cache_fresh:
            if force:
                wait_sec = int(WEATHER_CACHE_TTL_SECONDS - age)
                return {
                    "data": cached_data,
                    "error": f"갱신은 10분마다 가능합니다. 약 {max(wait_sec, 0)}초 후 다시 시도하세요.",
                    "cached": True,
                    "last_updated": last_updated,
                }
            return {"data": cached_data, "error": None, "cached": True, "last_updated": last_updated}

        # Otherwise, attempt refresh (single-flight under lock)
        try:
            data = await scrape_airport_weather()
            _weather_cache["data"] = data
            _weather_cache["fetched_at"] = now
            _weather_cache["last_updated"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))
            return {"data": data, "error": None, "cached": False, "last_updated": _weather_cache["last_updated"]}
        except Exception as e:
            logger.exception("기상 데이터 수집 실패")
            # Fallback to previous cache if exists
            if cached_data:
                return {
                    "data": cached_data,
                    "error": f"갱신 실패로 이전 데이터를 표시합니다: {str(e)}",
                    "cached": True,
                    "last_updated": last_updated,
                }
            return {"data": [], "error": str(e), "cached": False, "last_updated": None}

@app.get("/api/forecast/{icao_code}")
async def get_forecast(icao_code: str):
    from scraper import scrape_airport_forecast
    data = await scrape_airport_forecast(icao_code)
    return data

@app.get("/api/special-reports")
async def get_special_reports():
    from scraper import scrape_special_reports
    data = await scrape_special_reports()
    return data

@app.post("/api/history/save")
async def save_history(request: Request):
    """Save weather data snapshot"""
    try:
        body_bytes = await request.body()
        logger.info(f"Received save request, body size: {len(body_bytes)} bytes")
        
        try:
            weather_data = json.loads(body_bytes.decode('utf-8'))
        except UnicodeDecodeError:
            # Try handling potential CP949 or other encodings if UTF-8 fails
            logger.warning("UTF-8 decode failed, trying cp949")
            weather_data = json.loads(body_bytes.decode('cp949'))

        if not weather_data:
            logger.warning("Empty weather data received")
            return {"success": False, "error": "No weather data provided"}
            
        snapshot_id = await save_weather_snapshot(weather_data)
        logger.info(f"Successfully saved snapshot with ID: {snapshot_id}")
        return {"success": True, "snapshot_id": snapshot_id}
    except Exception as e:
        logger.error(f"Error in save_history: {str(e)}", exc_info=True)
        return {"success": False, "error": str(e)}

@app.get("/api/history/snapshots")
async def list_snapshots():
    """Get all saved snapshots"""
    snapshots = await get_all_snapshots()
    return snapshots

@app.get("/api/history/snapshot/{snapshot_id}")
async def get_snapshot(snapshot_id: int):
    """Get weather data for a specific snapshot"""
    data = await get_snapshot_data(snapshot_id)
    return data

@app.get("/api/history/airport/{airport_code}")
async def get_airport_hist(airport_code: str):
    """Get historical data for a specific airport"""
    history = await get_airport_history(airport_code)
    return history

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)

