import asyncio
import json
import os
import sys
import psycopg2
from urllib.parse import urlparse
from playwright.async_api import async_playwright
from datetime import datetime

# --- 1. 공항별 실시간 기상 수집 (기존 로직) ---
async def scrape_airport_weather():
    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context()
            page = await context.new_page()
            
            url = "https://amo.kma.go.kr/"
            print(f"URL 접속 중: {url}")
            await page.goto(url, timeout=60000)
            await page.wait_for_selector("li.ca-item", timeout=30000)
            
            airport_data = await page.evaluate('''() => {
                const results = [];
                const seenIcao = new Set();
                const items = document.querySelectorAll('li.ca-item');
                
                const ICON_MAP = {
                    "mtph1": "맑음", "mtph01": "맑음", "mtph21": "맑음",
                    "mtph2": "구름조금", "mtph02": "구름조금", "mtph22": "구름조금",
                    "mtph3": "구름많음", "mtph03": "구름많음", "mtph23": "구름많음",
                    "mtph4": "흐림", "mtph04": "흐림", "mtph24": "흐림",
                    "mtph15": "맑음", "wi1": "맑음", "wi01": "맑음", "wi21": "맑음",
                    "wi2": "구름조금", "wi02": "구름조금", "wi22": "구름조금",
                    "wi3": "구름많음", "wi03": "구름많음", "wi23": "구름많음",
                    "wi4": "흐림", "wi04": "흐림", "wi24": "흐림",
                };

                items.forEach(item => {
                    const nameElement = item.querySelector('.main_air_name');
                    if (!nameElement) return;
                    
                    const code = item.querySelector('.main_air_name span')?.textContent.trim() || "";
                    if (!code || seenIcao.has(code)) return;
                    
                    const name = nameElement.childNodes[0].textContent.trim();
                    seenIcao.add(code);
                    
                    const weatherElem = item.querySelector('.main_air_wthr');
                    const iconClass = weatherElem?.querySelector('span')?.className || "";
                    let condition = "";
                    
                    const blindText = weatherElem?.querySelector('.blind, .sr-only')?.textContent.trim();
                    if (blindText) {
                        condition = blindText;
                    } else {
                        let rawText = weatherElem?.textContent.trim() || "";
                        if (rawText.includes("체감") || !rawText) {
                            const classes = iconClass.split(" ");
                            let found = false;
                            for (let c of classes) {
                                if (ICON_MAP[c]) {
                                    condition = ICON_MAP[c];
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                condition = rawText.replace(/체감.*/g, "").trim();
                                if (!condition) condition = "맑음";
                            }
                        } else {
                            condition = rawText;
                        }
                    }

                    if (condition === "자동관측" || condition === "-") {
                        const airTextElem = item.querySelector('.main_air_text');
                        if (airTextElem) {
                             const childNodes = airTextElem.childNodes;
                             for (let i = 0; i < childNodes.length; i++) {
                                 if (childNodes[i].nodeName === 'BR' && childNodes[i+1]) {
                                     const nextText = childNodes[i+1].textContent.trim();
                                     if (nextText && nextText !== "자동관측") {
                                         condition = nextText;
                                         break;
                                     }
                                 }
                             }
                        }
                    }
                    
                    if (condition === "자동관측" || !condition) condition = "-";
                    
                    const temp = item.querySelector('.main_air_text b')?.textContent.trim() || "";
                    const infoList = item.querySelectorAll('.main_air_info ul li');
                    const info = {};
                    infoList.forEach(li => {
                        const text = li.textContent.trim();
                        if (text.includes('풍향')) info.wind_dir = text.replace('풍향', '').trim();
                        if (text.includes('풍속')) info.wind_speed = text.replace('풍속', '').trim();
                        if (text.includes('시정')) info.visibility = text.replace('시정', '').trim();
                        if (text.includes('운고')) info.cloud = text.replace('운고', '').trim();
                        if (text.includes('일강수')) info.rain = text.replace('일강수', '').trim();
                    });
                    
                    const time = item.querySelector('.info_time')?.textContent.trim() || "";
                    
                    results.push({
                        name, code, condition, iconClass, temp,
                        wind_dir: info.wind_dir || "",
                        wind_speed: info.wind_speed || "",
                        visibility: info.visibility || "",
                        cloud: info.cloud || "",
                        rain: info.rain || "",
                        time
                    });
                });
                return results;
            }''')
            
            # --- 상세 예보 병렬 수집 ---
            async def fetch_forecast(ctx, icao):
                p = await ctx.new_page()
                try:
                    f_url = f"https://amo.kma.go.kr/weather/airport.do?icaoCode={icao}"
                    await p.goto(f_url, timeout=30000)
                    await p.wait_for_selector(".ts-wrap", timeout=5000)
                    forecast_data = await p.evaluate('''() => {
                        const dailyItems = document.querySelectorAll('.ts-daily-item');
                        const results = [];
                        const targetDays = Array.from(dailyItems).slice(0, 3);
                        targetDays.forEach(day => {
                            const hourlyItems = day.querySelectorAll('.ts-hourly-item');
                            const hourlyData = [];
                            hourlyItems.forEach(hour => {
                                const lis = hour.querySelectorAll('li');
                                if (lis.length < 8) return;
                                hourlyData.push({
                                    condition: lis[2].querySelector('.ts-wicon')?.innerText.trim() || lis[2].innerText.replace('날씨', '').trim()
                                });
                            });
                            results.push({ forecasts: hourlyData });
                        });
                        return results;
                    }''')
                    if not forecast_data: return " - "
                    all_hours = []
                    for day in forecast_data:
                        all_hours.extend(day.get('forecasts', []))
                    if len(all_hours) >= 12:
                        h4 = all_hours[3].get('condition', '-')
                        h8 = all_hours[7].get('condition', '-')
                        h12 = all_hours[11].get('condition', '-')
                        return f"{h4} > {h8} > {h12}"
                    return " - "
                except: return " - "
                finally: await p.close()

            icao_codes = [airport['code'] for airport in airport_data]
            forecast_results = await asyncio.gather(*(fetch_forecast(context, code) for code in icao_codes))
            for i in range(len(airport_data)):
                airport_data[i]['forecast_12h'] = forecast_results[i]
            
            return airport_data
        except Exception as e:
            print(f"오류 발생: {e}")
            return []
        finally:
            if 'browser' in locals(): await browser.close()

# --- 2. 기상청 특보 수집 (수정 및 로깅 강화) ---
async def scrape_special_reports():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        url = "https://www.weather.go.kr/w/special-report/overall.do"
        print(f"특보 정보 접속 중: {url}")
        
        try:
            await page.goto(url, timeout=60000)
            # [수정] 자바스크립트 로딩 완료 및 셀렉터 대기
            await page.wait_for_load_state("networkidle", timeout=10000)
            await page.wait_for_selector(".cmp-weather-cmt-txt-box", timeout=30000)
            print("특보 페이지 로드 완료, 데이터 추출 중...")
            
            raw_lines = await page.evaluate('''() => {
                const results = [];
                const paragraphs = document.querySelectorAll('.cmp-weather-cmt-txt-box .paragraph');
                paragraphs.forEach(el => {
                    const html = el.innerHTML.replace(/<br\s*\/?>/gi, '\\n');
                    const temp = document.createElement('div');
                    temp.innerHTML = html;
                    const text = temp.innerText;
                    text.split('\\n').forEach(line => {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('o')) results.push(trimmed);
                    });
                });
                return results;
            }''')
            
            mapping_aliases = {
                "인천": (["인천"], "인천"), "김포": (["서울", "서울특별시"], "서울서남권"),
                "청주": (["충청북도", "충북"], "청주"), "대구": (["대구", "대구광역시"], "대구"),
                "광주": (["광주", "광주광역시"], "광주"), "무안": (["전라남도", "전남"], "무안"),
                "김해": (["부산", "부산광역시"], "부산 서부"), "제주": (["제주", "제주도"], "제주도북부"),
                "원주": (["강원도", "강원"], "횡성"), "군산": (["전라북도", "전북"], "군산"),
                "울산": (["울산", "울산광역시"], "울산동부"), "포항": (["경상북도", "경북"], "포항"),
                "여수": (["전라남도", "전남"], "여수"), "사천": (["경상남도", "경남"], "사천"),
                "양양": (["강원도", "강원"], "양양평지")
            }

            results = {k: [] for k in mapping_aliases.keys()}
            import re
            for line in raw_lines:
                if ":" not in line: continue
                parts = line.split(":", 1)
                raw_type = parts[0].replace("o", "").strip()
                if not raw_type or raw_type[0].isdigit() or "발표" in raw_type: continue
                content = parts[1].strip()

                # 특보 명칭 포맷팅
                if "대설" in raw_type:
                    formatted_type = "대설예" if any(x in raw_type for x in ["예보", "예비"]) else "대설주" if "주의보" in raw_type else "대설경" if "경보" in raw_type else raw_type[:3]
                else: formatted_type = raw_type[:2]
                
                for airport, (uppers, lower) in mapping_aliases.items():
                    matched = False
                    for upper in uppers:
                        if upper in content:
                            pattern = re.escape(upper) + r"(?:\(([^)]+)\))?"
                            matches = re.finditer(pattern, content)
                            for m in matches:
                                sub_content = m.group(1)
                                if sub_content is None: matched = True; break
                                else:
                                    norm_sub, norm_lower = sub_content.replace(" ", ""), lower.replace(" ", "")
                                    if "제외" in norm_sub:
                                        if norm_lower not in norm_sub: matched = True; break
                                    else:
                                        if norm_lower in norm_sub: matched = True; break
                    if matched and formatted_type not in results[airport]:
                        results[airport].append(formatted_type)

            final_data = [{"airport": ap, "special_report": ", ".join(reps) if reps else "-"} for ap, reps in results.items()]
            print(f"특보 수집 완료: {len([f for f in final_data if f['special_report'] != '-'])}건 매칭됨")
            return final_data
        except Exception as e:
            print(f"특보 스크래핑 오류: {e}")
            return []
        finally: await browser.close()

# --- 3. 실행 및 DB 저장 ---
async def run():
    print(f"🚀 실행 시작: {datetime.now()}")
    
    # 데이터 병렬 수집
    weather_task = scrape_airport_weather()
    report_task = scrape_special_reports()
    
    airport_weather, special_reports = await asyncio.gather(weather_task, report_task)
    
    if not airport_weather:
        print("❌ 수집된 날씨 데이터가 없습니다. 중단합니다.")
        return

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL 설정이 없습니다.")
        return

    try:
        result = urlparse(db_url)
        conn = psycopg2.connect(
            database=result.path[1:], user=result.username, password=result.password,
            host=result.hostname, port=result.port
        )
        cur = conn.cursor()

        # 테이블 및 컬럼 준비
        cur.execute("""
            CREATE TABLE IF NOT EXISTS weather_latest (
                id INTEGER PRIMARY KEY,
                data JSONB,
                special_reports JSONB,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # [수정] special_reports 컬럼이 없는 경우를 대비한 추가 (최초 1회 실행용)
        try:
            cur.execute("ALTER TABLE weather_latest ADD COLUMN IF NOT EXISTS special_reports JSONB")
        except: pass

        # 데이터 저장
        cur.execute("""
            INSERT INTO weather_latest (id, data, special_reports, updated_at)
            VALUES (1, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE 
            SET data = EXCLUDED.data, 
                special_reports = EXCLUDED.special_reports,
                updated_at = EXCLUDED.updated_at
        """, (json.dumps(airport_weather, ensure_ascii=False), json.dumps(special_reports, ensure_ascii=False)))

        conn.commit()
        print("✅ DB 저장 완료!")
    except Exception as e:
        print(f"❌ DB 오류: {e}")
    finally:
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    asyncio.run(run())
