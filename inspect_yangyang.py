import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("https://amo.kma.go.kr/", timeout=60000)
        await page.wait_for_selector("li.ca-item", timeout=30000)
        
        # Get HTML of Yangyang item
        html = await page.evaluate('''() => {
            const items = document.querySelectorAll('li.ca-item');
            for (let item of items) {
                if (item.innerText.includes('양양')) {
                    return item.outerHTML;
                }
            }
            return "Not Found";
        }''')
        
        print(html)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
