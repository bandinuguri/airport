import asyncio
import json
import time
from scraper import scrape_airport_weather

async def run():
    print("Starting full scraper test...")
    start_time = time.time()
    
    data = await scrape_airport_weather()
    
    end_time = time.time()
    duration = end_time - start_time
    print(f"Scraping took {duration:.2f} seconds")
    
    # Check for "체감" in condition
    feels_like_issues = [item for item in data if "체감" in item['condition']]
    if feels_like_issues:
        print(f"FAILED: Found '체감' in conditions for: {[i['name'] for i in feels_like_issues]}")
    else:
        print("PASSED: No '체감' text found in conditions.")

    # Print a sample
    print(json.dumps(data[:2], indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(run())
