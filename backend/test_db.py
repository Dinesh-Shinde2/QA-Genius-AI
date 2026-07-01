import asyncio
import asyncpg

async def test_password(password: str):
    try:
        conn = await asyncpg.connect(
            user="postgres",
            password=password,
            database="qagenius",
            host="localhost",
            port=5432
        )
        print(f"SUCCESS: Connected successfully with password: '{password}'")
        await conn.close()
        return True
    except Exception as e:
        print(f"FAILED: Password: '{password}' | Error: {e}")
        return False

async def main():
    passwords_to_try = ["Mayur2091@", "Mayur2091", "postgres", "admin"]
    print("Testing password variations...")
    print("----------------------------------------")
    for pwd in passwords_to_try:
        success = await test_password(pwd)
        if success:
            print("----------------------------------------")
            print(f"Found working password: {pwd}")
            break
    else:
        print("----------------------------------------")
        print("None of the variations worked. Please check your PostgreSQL 'postgres' user password.")

if __name__ == "__main__":
    asyncio.run(main())
