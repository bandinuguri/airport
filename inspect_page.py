import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            print("Navigating to page...")
            await page.goto("https://www.weather.go.kr/w/special-report/overall.do", timeout=60000)
            print("Page loaded. Waiting for content...")
            
            # Wait for some content that usually appears
            # "li.ca-item" was for airport, here we look for special report specific.
            # Looking at the prev output, maybe just wait a bit or wait for `.wr-warn` or similar if I knew it.
            # I'll just wait for 5 seconds to be safe as I don't know the selector.
            await page.wait_for_timeout(5000)
            
            content = await page.content()
            with open("page_dump.txt", "w", encoding="utf-8") as f:
                f.write(content)
            print("Content saved to page_dump.txt")
            
            # Also try to print specific text if found to see if we got it
            text = await page.inner_text("body")
            print("captured text length:", len(text))
            
        except Exception as e:
            print(f"Error: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
