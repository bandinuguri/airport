import os
import json
import asyncio
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from scraper import scrape_airport_weather

app = FastAPI()

# CORS 설정 (개발 환경용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# index.html이 있는 경로를 static으로 잡거나 직접 root에서 반환
@app.get("/", response_class=HTMLResponse)
async def read_index():
    if os.path.exists("index.html"):
        with open("index.html", "r", encoding="utf-8") as f:
            return f.read()
    return "index.html not found"

@app.get("/api/weather")
async def get_weather():
    data = await scrape_airport_weather()
    return data

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
