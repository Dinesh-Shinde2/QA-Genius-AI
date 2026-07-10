import asyncio
import os
import sys

# Add parent directory to sys.path to resolve 'backend' imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.db import get_db_pool, close_db_pool
from backend.main import lifespan

class MockApp:
    pass

async def main():
    print("Step 1: Reading database/schema.sql...")
    schema_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "database",
        "schema.sql"
    )
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    print("Step 2: Connecting to Supabase pool...")
    pool = await get_db_pool()
    
    print("Step 3: Running base schema.sql (skipping if already initialized)...")
    async with pool.acquire() as conn:
        try:
            await conn.execute(schema_sql)
            print("Base schema.sql executed successfully.")
        except Exception as e:
            print(f"Info: Base schema skipped or already initialized: {e}")

    print("Step 4: Running application-level migrations from main.py...")
    # Use the context manager to run startup migrations and automatically close pool on exit
    app = MockApp()
    async with lifespan(app):
        print("Application tables and migrations initialized successfully.")

    print("Database setup complete! You can now check your Supabase dashboard.")

if __name__ == "__main__":
    asyncio.run(main())
