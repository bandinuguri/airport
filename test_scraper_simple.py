
import asyncio
from scraper import scrape_airport_weather
import json

async def test():
    print("Testing scraper...")
    try:
        data = await scrape_airport_weather()
        print(json.dumps(data, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
