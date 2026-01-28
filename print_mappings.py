import asyncio
from scraper import scrape_airport_weather

async def run():
    data = await scrape_airport_weather()
    for item in data:
        print(f"{item['name']}: {item['condition']} ({item['iconClass']})")

if __name__ == "__main__":
    asyncio.run(run())
