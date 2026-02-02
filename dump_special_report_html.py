import asyncio
import sys
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        url = "https://www.weather.go.kr/w/special-report/overall.do"
        print(f"Connecting to: {url}")
        
        try:
            await page.goto(url, timeout=60000)
            # Wait a bit for JS to render
            await asyncio.sleep(5)
            
            # Get the content of interest
            content = await page.content()
            with open("special_report_dump.html", "w", encoding="utf-8") as f:
                f.write(content)
            
            # Also try to find specifically the .cmp-weather-cmt-txt-box content
            try:
                box_html = await page.inner_html(".cmp-weather-cmt-txt-box")
                with open("special_report_box.html", "w", encoding="utf-8") as f:
                    f.write(box_html)
                print("Successfully dumped box HTML.")
            except:
                print("Could not find .cmp-weather-cmt-txt-box")

            # Try finding any 'o ' patterns
            pattern_content = await page.evaluate('''() => {
                const results = [];
                const allP = document.querySelectorAll('p, div, span');
                allP.forEach(el => {
                    const text = el.innerText.trim();
                    if (text.startsWith('o ')) {
                        results.push(text);
                    }
                });
                return results;
            }''')
            print(f"Found {len(pattern_content)} lines starting with 'o '")
            for line in pattern_content[:5]:
                print(f"  {line}")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
