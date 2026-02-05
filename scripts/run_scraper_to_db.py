import os
import json
import asyncio
import psycopg2
import sys
from urllib.parse import urlparse
from datetime import datetime

# 상위 폴더의 scraper.py를 인식하기 위한 경로 설정
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scraper import scrape_airport_weather, scrape_special_reports

async def main():
    print(f"🚀 데이터 수집 프로세스 시작: {datetime.now()}")

    # 1. 데이터 수집
    try:
        weather_task = scrape_airport_weather()
        report_task = scrape_special_reports()
        airport_weather, special_reports = await asyncio.gather(weather_task, report_task)
        print(f"✅ 수집 완료: 날씨 {len(airport_weather)}건")
    except Exception as e:
        print(f"❌ 수집 단계 오류: {e}")
        return

    # 2. DB 연결
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL 없음")
        return

    try:
        result = urlparse(db_url)
        conn = psycopg2.connect(
            database=result.path[1:], user=result.username, password=result.password,
            host=result.hostname, port=result.port
        )
        cur = conn.cursor()

        # 3. 데이터 저장
        query = """
            INSERT INTO weather_latest (id, data, special_reports, updated_at)
            VALUES (1, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE 
            SET data = EXCLUDED.data,
                special_reports = EXCLUDED.special_reports,
                updated_at = EXCLUDED.updated_at;
        """
        cur.execute(query, (
            json.dumps(airport_weather, ensure_ascii=False),
            json.dumps(special_reports, ensure_ascii=False)
        ))
        conn.commit()
        print("✨ Supabase 저장 완료!")
    except Exception as e:
        print(f"❌ DB 오류: {e}")
    finally:
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    asyncio.run(main())
