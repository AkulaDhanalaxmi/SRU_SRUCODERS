import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from backend.seed import seed_db

ROOT_DIR = Path(__file__).parent / 'backend'
load_dotenv(ROOT_DIR / '.env')
MONGO_URL = os.getenv('MONGO_URL')
DB_NAME = os.getenv('DB_NAME')

if not MONGO_URL or not DB_NAME:
    raise SystemExit('MONGO_URL and DB_NAME must be set in backend/.env')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

async def main():
    await seed_db(db)
    print('seed complete')

if __name__ == '__main__':
    asyncio.run(main())
