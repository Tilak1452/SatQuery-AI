import asyncio
import ee
from datetime import date, timedelta
from backend.app.gee_client import initialize_gee
from backend.app.pipelines.optical import run_optical_pipeline

def dummy_send_status(msg):
    print(f"[STATUS] {msg}")

async def main():
    print("Initializing GEE...")
    initialize_gee()

    # 1. Test Auto-Expansion: 2-day window over Delhi
    print("\n--- Test 1: Narrow 2-day window (Testing Auto-Expansion) ---")
    delhi_geom = ee.Geometry.Polygon([[
        [77.205, 28.620],
        [77.230, 28.620],
        [77.230, 28.645],
        [77.205, 28.645],
        [77.205, 28.620]
    ]])
    end_date = date.today()
    start_date = end_date - timedelta(days=2)
    try:
        res = run_optical_pipeline(delhi_geom, start_date, end_date, dummy_send_status)
        print(f"[TEST 1 PASSED] Auto-expansion succeeded! Thumb URL: {res['thumb_url'][:60]}...")
    except Exception as e:
        print(f"[TEST 1 FAILED] {e}")

    # 2. Test Open Ocean Detection: Deep Atlantic Ocean (0.0, 0.0) where Sentinel-2 has zero coverage
    print("\n--- Test 2: Open Ocean Detection (Deep Atlantic) ---")
    ocean_geom = ee.Geometry.Polygon([[
        [-10.0, 0.0],
        [-9.9, 0.0],
        [-9.9, 0.1],
        [-10.0, 0.1],
        [-10.0, 0.0]
    ]])
    try:
        res = run_optical_pipeline(ocean_geom, end_date - timedelta(days=30), end_date, dummy_send_status)
        print(f"[TEST 2 UNEXPECTED] Images found in open ocean: {res['thumb_url'][:60]}...")
    except ValueError as e:
        print(f"[TEST 2 PASSED] Caught expected ocean error:\n  '{e}'")
    except Exception as e:
        print(f"[TEST 2 FAILED] Unexpected error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
