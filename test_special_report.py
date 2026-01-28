import asyncio
import json
from scraper import scrape_special_reports

async def run():
    print("Testing scrape_special_reports...")
    data = await scrape_special_reports()
    print(json.dumps(data, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(run())
