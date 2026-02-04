#!/usr/bin/env python3
"""
GitHub Actions 등에서 주기 실행: 스크래핑 후 Supabase(Postgres)에 저장.
환경변수 DATABASE_URL (Postgres 연결 문자열) 필요.
"""
import os
import sys
import json
import asyncio

# 프로젝트 루트
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_connection():
    import psycopg2
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL 환경변수가 필요합니다.")
    # Supabase/일부 호스트는 sslmode 요구
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return psycopg2.connect(url)


def upsert_weather_latest(conn, data: list, special_reports: list):
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO weather_latest (id, data, special_reports, updated_at)
        VALUES (1, %s::jsonb, %s::jsonb, %s)
        ON CONFLICT (id) DO UPDATE SET
          data = EXCLUDED.data,
          special_reports = EXCLUDED.special_reports,
          updated_at = EXCLUDED.updated_at
        """,
        (json.dumps(data, ensure_ascii=False), json.dumps(special_reports, ensure_ascii=False), now)
    )
    conn.commit()
    cur.close()
    print(f"weather_latest 갱신 완료 (items={len(data)}, at={now})")


def main():
    from scraper import scrape_airport_weather, scrape_special_reports

    async def run():
        print("스크래핑 시작...")
        weather_data = await scrape_airport_weather()
        print(f"기상 데이터 수집: {len(weather_data)}건")
        try:
            reports = await scrape_special_reports()
        except Exception as e:
            print(f"특보 수집 실패(무시): {e}")
            reports = []
        return weather_data, reports

    weather_data, special_reports = asyncio.run(run())
    if not weather_data:
        print("기상 데이터가 없어 DB를 갱신하지 않습니다.")
        sys.exit(1)

    conn = get_connection()
    try:
        upsert_weather_latest(conn, weather_data, special_reports)
    finally:
        conn.close()
    print("완료.")


if __name__ == "__main__":
    main()
