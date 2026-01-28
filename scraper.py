import asyncio
import json
from playwright.async_api import async_playwright

async def scrape_airport_weather():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Create a context to be shared
        context = await browser.new_context()
        page = await context.new_page()
        
        url = "https://amo.kma.go.kr/"
        print(f"URL 접속 중: {url}")
        
        try:
            await page.goto(url, timeout=60000)
            await page.wait_for_selector("li.ca-item", timeout=30000)
            
            airport_data = await page.evaluate('''() => {
                const results = [];
                const seenIcao = new Set();
                const items = document.querySelectorAll('li.ca-item');
                
                // Icon mapping for fallback
                const ICON_MAP = {
                    "mtph1": "맑음", "mtph01": "맑음", "mtph21": "맑음",
                    "mtph2": "구름조금", "mtph02": "구름조금", "mtph22": "구름조금",
                    "mtph3": "구름많음", "mtph03": "구름많음", "mtph23": "구름많음",
                    "mtph4": "흐림", "mtph04": "흐림", "mtph24": "흐림",
                    "mtph15": "맑음", // Assuming clear/cold
                    "wi1": "맑음", "wi01": "맑음", "wi21": "맑음",
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
                    
                    // 1. Try to find hidden text (blind/sr-only) first for accurate condition
                    const blindText = weatherElem?.querySelector('.blind, .sr-only')?.textContent.trim();
                    if (blindText) {
                        condition = blindText;
                    } else {
                        let rawText = weatherElem?.textContent.trim() || "";
                        
                        // Check for "체감" or empty text
                        if (rawText.includes("체감") || !rawText) {
                            // Use icon mapping
                            const classes = iconClass.split(" ");
                            let found = false;
                            for (let c of classes) {
                                if (ICON_MAP[c]) {
                                    condition = ICON_MAP[c];
                                    found = true;
                                    break;
                                }
                            }
                            // If still includes 체감 or empty, try simplified cleanup
                            if (!found) {
                                condition = rawText.replace(/체감.*/g, "").trim(); // Aggressive strip
                                if (!condition) condition = "맑음"; // Force clear if it was just "체감..."
                            }
                        } else {
                            condition = rawText;
                        }
                    }

                    if (!condition) condition = "-";
                    
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
                        name,
                        code,
                        condition,
                        iconClass,
                        temp,
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
            
            # ---------------------------------------------------------
            # FAST PARALLEL FORECAST SCRAPING (Single Browser Instance)
            # ---------------------------------------------------------
            
            async def fetch_forecast(ctx, icao):
                # Open a new page in the SAME context/browser
                p = await ctx.new_page()
                try:
                    f_url = f"https://amo.kma.go.kr/weather/airport.do?icaoCode={icao}"
                    await p.goto(f_url, timeout=30000) # Shorter timeout for individual pages
                    
                    try:
                        await p.wait_for_selector(".ts-wrap", timeout=5000) # Fast wait
                    except:
                        return " - "

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
                    
                except Exception:
                    return " - "
                finally:
                    await p.close()

            # Extract ICAO codes
            icao_codes = [airport['code'] for airport in airport_data]
            
            # Run all forecast fetches in parallel using the SHARED context
            forecast_results = await asyncio.gather(*(fetch_forecast(context, code) for code in icao_codes))
            
            for i in range(len(airport_data)):
                airport_data[i]['forecast_12h'] = forecast_results[i]
            
            return airport_data
            
        except Exception as e:
            print(f"오류 발생: {e}")
            return []
        finally:
            await browser.close()

async def scrape_special_reports():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        url = "https://www.weather.go.kr/w/special-report/overall.do"
        print(f"특보 정보 접속 중: {url}")
        
        try:
            await page.goto(url, timeout=60000)
            await page.wait_for_selector(".cmp-weather-cmt-txt-box", timeout=30000)
            
            # 특보 텍스트 추출
            raw_lines = await page.evaluate('''() => {
                const lines = [];
                const paragraphs = document.querySelectorAll('.cmp-weather-cmt-txt-box .paragraph p.tit');
                paragraphs.forEach(p => {
                    const text = p.innerText.trim();
                    if (text) lines.push(text);
                });
                return lines;
            }''')
            
            # 파싱 및 공항 매핑 로직
            # 매핑 정의 (공항명: (상위지역, 하위지역))
            # 상위지역: 특보 텍스트에서 찾을 큰 지역명 (예: 서울)
            # 하위지역: 괄호 안에 있을 경우 확인할 세부 지역명 (예: 서울서남권) (없으면 상위지역 전체 적용 가정)
            # 주의: "인천"의 경우 "인천"이 상위, "인천"이 하위로 설정됨.
            mapping = {
                "인천": ("인천", "인천"),
                "김포": ("서울", "서울서남권"),
                "청주": ("충청북도", "청주"),
                "대구": ("대구", "대구"),
                "광주": ("광주", "광주"),
                "무안": ("전라남도", "무안"),
                "김해": ("부산", "부산 서부"), # 부산 서부 -> 부산(부산 서부) 또는 그냥 부산
                "제주": ("제주", "제주도북부"),
                "원주": ("강원도", "횡성"),
                "군산": ("전라북도", "군산"), # 전북자치도 -> 전라북도/전북 매핑 필요. 코드상 전라북도로 검색 시도.
                "울산": ("울산", "울산동부"),
                "포항": ("경상북도", "포항"),
                "여수": ("전라남도", "여수"),
                "사천": ("경상남도", "사천"),
                "양양": ("강원도", "양양평지")
            }
            
            # "전북자치도" -> "전라북도" normalization might be needed if text uses standard naming
            # Text uses "전라북도" (historically) or "전북자치도"?
            # User said "전북자치도". Let's assume standard "전라북도" in scraper for safety, or check both.
            # Updated mapping to use lists for Upper Region to support aliases
            
            mapping_aliases = {
                "인천": (["인천"], "인천"),
                "김포": (["서울", "서울특별시"], "서울서남권"),
                "청주": (["충청북도", "충북"], "청주"),
                "대구": (["대구", "대구광역시"], "대구"),
                "광주": (["광주", "광주광역시"], "광주"),
                "무안": (["전라남도", "전남"], "무안"),
                "김해": (["부산", "부산광역시"], "부산 서부"), 
                "제주": (["제주", "제주도"], "제주도북부"), # 제주도 북부? 제주시는 제주도북부 포함
                "원주": (["강원도", "강원"], "횡성"),
                "군산": (["전라북도", "전북", "전북자치도", "전북특별자치도"], "군산"),
                "울산": (["울산", "울산광역시"], "울산동부"),
                "포항": (["경상북도", "경북"], "포항"),
                "여수": (["전라남도", "전남"], "여수"),
                "사천": (["경상남도", "경남"], "사천"),
                "양양": (["강원도", "강원"], "양양평지")
            }

            results = {k: [] for k in mapping_aliases.keys()}
            
            for line in raw_lines:
                # Filter strict format: "o [Type] : [Content]"
                if not line.strip().startswith("o"): continue
                
                parts = line.split(":")
                if len(parts) < 2: continue
                
                raw_type = parts[0].replace("o", "").strip() # "한파주의보"
                content = parts[1].strip() # "경기도(...), ..."
                
                # Formatting Logic
                formatted_type = raw_type
                if "대설" in raw_type:
                    if "예비" in raw_type:
                        formatted_type = "대설예비"
                    elif "주의보" in raw_type:
                        formatted_type = "대설주의"
                    elif "경보" in raw_type:
                        formatted_type = "대설경보"
                    else:
                        formatted_type = raw_type # Fallback
                else:
                    # Others: 2 chars (e.g., 강풍, 한파, 건조)
                    formatted_type = raw_type[:2]
                
                # Check for each airport
                for airport, (uppers, lower) in mapping_aliases.items():
                    matched = False
                    
                    for upper in uppers:
                        if upper in content:
                            import re
                            pattern = re.escape(upper) + r"(?:\(([^)]+)\))?"
                            matches = re.finditer(pattern, content)
                            
                            for m in matches:
                                sub_content = m.group(1)
                                
                                if sub_content is None:
                                    matched = True
                                    break
                                else:
                                    norm_sub = sub_content.replace(" ", "")
                                    norm_lower = lower.replace(" ", "")
                                    
                                    if norm_lower in norm_sub:
                                        matched = True
                                        break
                            if matched:
                                break
                    
                    if matched:
                        if formatted_type not in results[airport]:
                             results[airport].append(formatted_type)

            # Format results
            final_data = []
            for airport, reports in results.items():
                report_str = ", ".join(reports) if reports else "-"
                final_data.append({
                    "airport": airport,
                    "special_report": report_str
                })
                
            return final_data

        except Exception as e:
            print(f"특보 스크래핑 오류: {e}")
            return []
        finally:
            await browser.close()

async def scrape_airport_forecast(icao_code):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        url = f"https://amo.kma.go.kr/weather/airport.do?icaoCode={icao_code}"
        print(f"상세 예보 접속 중: {url}")
        
        try:
            await page.goto(url, timeout=60000)
            # 타임 슬라이더 영역 대기
            await page.wait_for_selector(".ts-wrap", timeout=30000)
            
            # 3일치 예보 추출
            forecast_data = await page.evaluate('''() => {
                const dailyItems = document.querySelectorAll('.ts-daily-item');
                const results = [];
                
                // 조회일 포함 상위 3일만 처리 (최대 3일)
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
                            condition: lis[2].querySelector('.ts-wicon')?.innerText.trim() || lis[2].innerText.replace('날씨', '').trim(),
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
            }''')
            
            return forecast_data
        except Exception as e:
            print(f"예보 수집 중 오류: {e}")
            return []
        finally:
            await browser.close()

if __name__ == "__main__":
    # JS push 수정을 포함한 재작성
    import sys
    
    async def run():
        data = await scrape_airport_weather()
        print(json.dumps(data, ensure_ascii=False, indent=2))

    asyncio.run(run())
