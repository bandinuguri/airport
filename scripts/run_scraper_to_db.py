import os
import json
import asyncio
import psycopg2
import sys
from urllib.parse import urlparse
from datetime import datetime
from playwright.async_api import async_playwright  # ★ 추가

# 상위 폴더의 scraper.py를 인식하기 위한 경로 설정
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scraper import (
    scrape_airport_weather,
    scrape_special_reports,
    # scrape_airport_forecast 를 더 이상 scraper에서 가져오지 않습니다.
)

# --- 이 파일 안에 3일 예보 수집 함수 직접 구현 ---
async def scrape_airport_forecast(icao_code: str):
    """
    특정 ICAO 코드(예: RKSI)에 대한 3일 예보를 기상청 사이트에서 수집합니다.
    반환 형식 예:
    [
      {
        "date": "2026.02.05 (목)",
        "forecasts": [
          { "time": "00시", "condition": "...", "temp": "...", ... },
          ...
        ]
      },
      ...
    ]
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        url = f"https://amo.kma.go.kr/weather/airport.do?icaoCode={icao_code}"
        print(f"상세 예보 접속 중: {url}")

        try:
            await page.goto(url, timeout=60000)
            # 타임 슬라이더 영역 대기
            await page.wait_for_selector(".ts-wrap", timeout=30000)

            forecast_data = await page.evaluate(
                """() => {
                    const dailyItems = document.querySelectorAll('.ts-daily-item');
                    const results = [];

                    // 조회일 포함 상위 3일만 처리
                    const targetDays = Array.from(dailyItems).slice(0, 3);

                    targetDays.forEach(day => {
                        const dateText = day.querySelector('.ts-daily-head h3')?.innerText.trim() || "";
                        const hourlyItems = day.querySelectorAll('.ts-hourly-item');
                        const hourlyData = [];

                        hourlyItems.forEach(hour => {
                            const lis = hour.querySelectorAll('li');
                            if (lis.length < 8) return;

                            hourlyData.push({
                                time: lis[1].innerText.trim(),
                                condition: lis[2].querySelector('.ts-wicon')?.innerText.trim()
                                    || lis[2].innerText.replace('날씨', '').trim(),
                                temp: lis[3].innerText.trim(),
                                wind_dir: lis[4].innerText.trim(),
                                wind_speed: lis[5].innerText.trim(),
                                cloud: lis[6].innerText.trim(),
                                visibility: lis[7].innerText.trim()
                            });
                        });

                        results.push({
                            date: dateText,
                            forecasts: hourlyData
                        });
                    });

                    return results;
                }"""
            )

            return forecast_data
        except Exception as e:
            print(f"{icao_code} 예보 수집 중 오류: {e}")
            return []
        finally:
            await browser.close()


async def collect_forecasts(airport_weather: list) -> dict:
    """
    위에서 정의한 scrape_airport_forecast 를 이용해서
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
