"""
Vercel Serverless Function: /api/forecast/[icao_code]
동적 라우팅: /api/forecast/RKSI 같은 경로를 처리합니다.
Vercel은 파일 이름의 [icao_code]를 동적 파라미터로 인식합니다.
"""
import sys
import os
import json

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        import asyncio
        from scraper import scrape_airport_forecast
        
        # Vercel은 동적 라우팅 파라미터를 환경 변수나 요청 헤더로 전달합니다
        # 경로에서 직접 추출: /api/forecast/RKSI -> RKSI
        path = self.path.strip('/')
        path_parts = path.split('/')
        
        # /api/forecast/RKSI 형식에서 RKSI 추출
        icao_code = None
        if len(path_parts) >= 3 and path_parts[0] == 'api' and path_parts[1] == 'forecast':
            icao_code = path_parts[2]
        
        # Vercel의 동적 라우팅 파라미터 (있는 경우)
        if not icao_code:
            # 환경 변수에서 가져오기 시도
            import os
            icao_code = os.environ.get('VERCEL_URL_PARAM_icao_code') or os.environ.get('icao_code')
        
        if not icao_code:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            response = json.dumps({"error": "icao_code is required"}, ensure_ascii=False)
            self.wfile.write(response.encode('utf-8'))
            return
        
        try:
            data = asyncio.run(scrape_airport_forecast(icao_code))
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps(data, ensure_ascii=False)
            self.wfile.write(response.encode('utf-8'))
            
        except Exception as e:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps([], ensure_ascii=False)
            self.wfile.write(response.encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.end_headers()
