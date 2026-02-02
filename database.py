import sqlite3
import json
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Optional
from contextlib import asynccontextmanager

DATABASE_PATH = "weather_history.db"

def init_db():
    """Initialize the database with required tables"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Create snapshots table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(timestamp)
        )
    ''')
    
    # Create weather_data table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS weather_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            snapshot_id INTEGER NOT NULL,
            airport_code TEXT NOT NULL,
            airport_name TEXT NOT NULL,
            data_json TEXT NOT NULL,
            FOREIGN KEY (snapshot_id) REFERENCES snapshots(id)
        )
    ''')
    
    # Create index for faster queries
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_airport_code 
        ON weather_data(airport_code)
    ''')
    
    conn.commit()
    conn.close()

async def save_weather_snapshot(weather_data: List[Dict]) -> int:
    """Save a weather data snapshot"""
    print(f"DEBUG: save_weather_snapshot called with {len(weather_data)} items")
    loop = asyncio.get_event_loop()
    
    def _save():
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Create timestamp from first item's time or current time
        # Try different possible keys for time
        first_item = weather_data[0] if weather_data else {}
        timestamp = first_item.get('time') or first_item.get('timestamp')
        
        if not timestamp:
            # Include seconds to avoid UNIQUE constraint collisions during quick refreshes
            timestamp = datetime.now().strftime("%Y년 %m월 %d일(%a) %H:%M:%S(KST)")
        
        logging.info(f"DB: Using timestamp '{timestamp}'")
        created_at = datetime.now().isoformat()
        
        # Insert snapshot
        cursor.execute(
            'INSERT OR IGNORE INTO snapshots (timestamp, created_at) VALUES (?, ?)',
            (timestamp, created_at)
        )
        
        # Get snapshot_id
        cursor.execute('SELECT id FROM snapshots WHERE timestamp = ?', (timestamp,))
        row = cursor.fetchone()
        if not row:
            print("ERROR: Failed to retrieve snapshot ID after insert")
            conn.close()
            return -1
        snapshot_id = row[0]
        print(f"DEBUG: Snapshot ID is {snapshot_id}")
        
        # Delete existing weather data for this snapshot (if updating)
        cursor.execute('DELETE FROM weather_data WHERE snapshot_id = ?', (snapshot_id,))
        
        # Insert weather data
        count = 0
        for item in weather_data:
            # Robust field extraction
            airport_code = item.get('code') or item.get('icao') or item.get('airport_code') or 'UNKNOWN'
            airport_name = item.get('name') or item.get('airportName') or 'Unknown'
            
            cursor.execute('''
                INSERT INTO weather_data (snapshot_id, airport_code, airport_name, data_json)
                VALUES (?, ?, ?, ?)
            ''', (
                snapshot_id,
                airport_code,
                airport_name,
                json.dumps(item, ensure_ascii=False)
            ))
            count += 1
        
        conn.commit()
        conn.close()
        logging.info(f"DB: Successfully saved {count} airport records to snapshot {snapshot_id}")
        return snapshot_id
    
    return await loop.run_in_executor(None, _save)

async def get_all_snapshots() -> List[Dict]:
    """Get all saved snapshots"""
    loop = asyncio.get_event_loop()
    
    def _get():
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, timestamp, created_at 
            FROM snapshots 
            ORDER BY created_at DESC
        ''')
        
        snapshots = []
        for row in cursor.fetchall():
            snapshots.append({
                'id': row[0],
                'timestamp': row[1],
                'created_at': row[2]
            })
        
        conn.close()
        return snapshots
    
    return await loop.run_in_executor(None, _get)

async def get_snapshot_data(snapshot_id: int) -> List[Dict]:
    """Get all weather data for a specific snapshot"""
    loop = asyncio.get_event_loop()
    
    def _get():
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT data_json 
            FROM weather_data 
            WHERE snapshot_id = ?
            ORDER BY airport_name
        ''', (snapshot_id,))
        
        data = []
        for row in cursor.fetchall():
            data.append(json.loads(row[0]))
        
        conn.close()
        return data
    
    return await loop.run_in_executor(None, _get)

async def get_airport_history(airport_code: str) -> List[Dict]:
    """Get historical data for a specific airport across all snapshots"""
    loop = asyncio.get_event_loop()
    
    def _get():
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT s.timestamp, s.created_at, w.data_json
            FROM weather_data w
            JOIN snapshots s ON w.snapshot_id = s.id
            WHERE w.airport_code = ?
            ORDER BY s.created_at DESC
        ''', (airport_code,))
        
        history = []
        for row in cursor.fetchall():
            data = json.loads(row[2])
            data['snapshot_timestamp'] = row[0]
            data['snapshot_created_at'] = row[1]
            history.append(data)
        
        conn.close()
        return history
    
    return await loop.run_in_executor(None, _get)

# Initialize database on module import
init_db()
