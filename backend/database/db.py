import os
import logging
import asyncpg
from dotenv import load_dotenv

# Load .env using an absolute path relative to this file's directory
db_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(db_dir)
dotenv_path = os.path.join(backend_dir, ".env")
load_dotenv(dotenv_path=dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Fallback to local default if not specified
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/qagenius"

_pool = None

logger = logging.getLogger(__name__)

async def get_db_pool():
    global _pool
    if _pool is None:
        try:
            logger.info("Initializing database connection pool...")
            _pool = await asyncpg.create_pool(
                DATABASE_URL,
                min_size=2,
                max_size=10,
                max_queries=50000,
                timeout=30.0,
                statement_cache_size=0
            )
            logger.info("Database connection pool established successfully.")
        except Exception as e:
            logger.error(f"Error establishing database connection pool: {e}")
            raise e
    return _pool

async def close_db_pool():
    global _pool
    if _pool is not None:
        logger.info("Closing database connection pool...")
        await _pool.close()
        _pool = None
        logger.info("Database connection pool closed.")

async def execute(query: str, *args):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        return await conn.execute(query, *args)

async def fetch(query: str, *args):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        return await conn.fetch(query, *args)

async def fetchrow(query: str, *args):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        return await conn.fetchrow(query, *args)

async def fetchval(query: str, *args):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        return await conn.fetchval(query, *args)
