"""
Vercel Serverless Function: GET /api/history/snapshot/[snapshot_id]
"""
import sys
import os
import json

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, project_root)

from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        import asyncio
        from database import get_snapshot_data
        
        # 경로에서 snapshot_id 추출
        path = self.path.strip('/')
        path_parts = path.split('/')
        
        snapshot_id = None
        if len(path_parts) >= 4 and path_parts[0] == 'api' and path_parts[1] == 'history' and path_parts[2] == 'snapshot':
            try:
                snapshot_id = int(path_parts[3])
            except ValueError:
                pass
        
        if not snapshot_id:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            response = json.dumps({"error": "snapshot_id is required"}, ensure_ascii=False)
            self.wfile.write(response.encode('utf-8'))
            return
        
        try:
            data = asyncio.run(get_snapshot_data(snapshot_id))
            
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
            
            response = json.dumps({}, ensure_ascii=False)
            self.wfile.write(response.encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
