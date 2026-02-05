import os
import json
import asyncio
import psycopg2
import sys
from urllib.parse import urlparse
from datetime import datetime

# 상위 폴더의 scraper.py를 인식하기 위한 경로 설정
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scraper import (
    scrape_airport_weather,
    scrape_special_reports,
    scrape_airport_forecast,  # 3일 예보 수집 함수
)


async def collect_forecasts(airport_weather: list) -> dict:
    """
    scraper.scrape_airport_forecast 를 이용해서
    각 공항 코드(ICAO)에 대한 3일 예보를 수집합니다.
    """
    # airport_weather 안에 들어있는 code 값들만 사용
    codes = sorted({item.get("code") for item in airport_weather if item.get("code")})
    forecasts: dict[str, list] = {}

    print(f"🌤 3일 예보 수집 대상 공항 수: {len(codes)}")

    for code in codes:
        try:
            print(f"📡 {code} 3일 예보 수집 중...")
            data = await scrape_airport_forecast(code)
            # data 형식: [{ date, forecasts: [...] }, ...]
            forecasts[code] = data or []
            print(f"  → {code}: {len(forecasts[code])}일 분 데이터")
        except Exception as e:
            print(f"  ❌ {code} 예보 수집 실패: {e}")
            forecasts[code] = []

    return forecasts


async def main():
    print(f"🚀 데이터 수집 프로세스 시작: {datetime.now()}")

    # 1. 현재 날씨 + 특보 수집
    try:
        weather_task = scrape_airport_weather()
        report_task = scrape_special_reports()
        airport_weather, special_reports = await asyncio.gather(weather_task, report_task)
        print(f"✅ 수집 완료: 날씨 {len(airport_weather)}건, 특보 {len(special_reports)}건")
    except Exception as e:
        print(f"❌ 수집 단계 오류: {e}")
        return

    # 2. 3일 예보 수집
    try:
        forecast_map = await collect_forecasts(airport_weather)
    except Exception as e:
        print(f"⚠️ 3일 예보 수집 전체 실패 (무시하고 진행): {e}")
        forecast_map = {}

    # 3. DB 연결
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL 없음 (GitHub Secrets에 설정 필요)")
        return

    try:
        result = urlparse(db_url)
        conn = psycopg2.connect(
            database=result.path[1:],
            user=result.username,
            password=result.password,
            host=result.hostname,
            port=result.port,
        )
        cur = conn.cursor()

        # 3-1. weather_latest 업데이트 (기존 로직)
        weather_query = """
        INSERT INTO weather_latest (id, data, special_reports, updated_at)
        VALUES (1, %s::jsonb, %s::jsonb, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE 
        SET data = EXCLUDED.data,
            special_reports = EXCLUDED.special_reports,
            updated_at = EXCLUDED.updated_at;
        """
        cur.execute(
            weather_query,
            (
                json.dumps(airport_weather, ensure_ascii=False),
                json.dumps(special_reports, ensure_ascii=False),
            ),
        )
        print("✨ weather_latest 갱신 완료")

        # 3-2. 공항별 3일 예보 저장
        # Supabase에 아래 테이블이 있어야 합니다:
        # CREATE TABLE IF NOT EXISTS airport_forecast_3day (
        #   airport_code TEXT PRIMARY KEY,
        #   data JSONB NOT NULL,
        #   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        # );
        forecast_query = """
        INSERT INTO airport_forecast_3day (airport_code, data, updated_at)
        VALUES (%s, %s::jsonb, CURRENT_TIMESTAMP)
        ON CONFLICT (airport_code) DO UPDATE
        SET data = EXCLUDED.data,
            updated_at = EXCLUDED.updated_at;
        """

        saved_count = 0
        for code, data in forecast_map.items():
            cur.execute(
                forecast_query,
                (code, json.dumps(data, ensure_ascii=False)),
            )
            saved_count += 1

        conn.commit()
        print(f"✨ 3일 예보 저장 완료: {saved_count}개 공항")

    except Exception as e:
        print(f"❌ DB 오류: {e}")
    finally:
        if "conn" in locals():
            conn.close()
            print("🔌 DB 연결 종료")


if __name__ == "__main__":
    asyncio.run(main())
