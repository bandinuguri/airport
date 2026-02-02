"""
Vercel Serverless Function: /api/weather
Vercel Python Functions는 BaseHTTPRequestHandler를 사용합니다.
"""
import sys
import os
import json
import time
import threading
from urllib.parse import urlparse, parse_qs

# 프로젝트 루트를 경로에 추가
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from http.server import BaseHTTPRequestHandler

WEATHER_CACHE_TTL_SECONDS = 10 * 60
_cache_lock = threading.Lock()
_cache = {
    "fetched_at": 0.0,
    "last_updated": None,
    "data": None,
}

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """GET /api/weather 핸들러"""
        import asyncio
        from scraper import scrape_airport_weather
        
        # query param: ?force=true
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        force = (qs.get("force", ["false"])[0] or "false").lower() in ("1", "true", "yes")

        try:
            now = time.time()
            with _cache_lock:
                cached_data = _cache.get("data")
                fetched_at = float(_cache.get("fetched_at") or 0.0)
                last_updated = _cache.get("last_updated")
                age = now - fetched_at if fetched_at else None
                cache_fresh = bool(cached_data) and age is not None and age < WEATHER_CACHE_TTL_SECONDS

                if cache_fresh:
                    if force:
                        wait_sec = int(WEATHER_CACHE_TTL_SECONDS - age)
                        payload = {"data": cached_data, "error": f"갱신은 10분마다 가능합니다. 약 {max(wait_sec, 0)}초 후 다시 시도하세요.", "cached": True, "last_updated": last_updated}
                    else:
                        payload = {"data": cached_data, "error": None, "cached": True, "last_updated": last_updated}
                else:
                    # refresh under lock to prevent stampede
                    data = asyncio.run(scrape_airport_weather())
                    _cache["data"] = data
                    _cache["fetched_at"] = now
                    _cache["last_updated"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))
                    payload = {"data": data, "error": None, "cached": False, "last_updated": _cache["last_updated"]}
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            response = json.dumps(payload, ensure_ascii=False)
            self.wfile.write(response.encode('utf-8'))
            
        except Exception as e:
            import traceback
            error_msg = str(e)
            print(f"Error in /api/weather: {error_msg}")
            print(traceback.format_exc())
            
            # fallback to cache if exists
            fallback = {"data": [], "error": error_msg, "cached": False, "last_updated": None}
            try:
                with _cache_lock:
                    if _cache.get("data"):
                        fallback = {
                            "data": _cache["data"],
                            "error": f"갱신 실패로 이전 데이터를 표시합니다: {error_msg}",
                            "cached": True,
                            "last_updated": _cache.get("last_updated"),
                        }
            except Exception:
                pass

            self.send_response(200)  # 에러여도 200으로 반환
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps(fallback, ensure_ascii=False)
            self.wfile.write(response.encode('utf-8'))
    
    def do_OPTIONS(self):
        """CORS preflight 요청 처리"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
