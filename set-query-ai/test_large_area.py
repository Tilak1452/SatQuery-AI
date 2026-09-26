import asyncio
import os
import ee
from datetime import date

from backend.app.gee_client import initialize_gee
from backend.app.pipelines.optical import run_optical_pipeline

def dummy_send_status(msg):
    print(f"STATUS: {msg}")

async def main():
    print("Initializing GEE...")
    initialize_gee()
    
    # Create a 250km2 polygon (15.8km x 15.8km) in San Francisco
    geom = ee.Geometry.Polygon([[
        [-122.50, 37.70],
        [-122.32, 37.70],
        [-122.32, 37.84],
        [-122.50, 37.84],
        [-122.50, 37.70]
    ]])
    
    date_start = date(2023, 1, 1)
    date_end = date(2023, 1, 31)
    
    print("\n--- Running Optical Pipeline for 250km2 ---")
    try:
        opt_res = run_optical_pipeline(geom, date_start, date_end, dummy_send_status)
        print("SUCCESS!")
        print(f"Optical Thumb URL: {opt_res['thumb_url']}")
        print(f"Optical Download URL: {opt_res['download_url']}")
    except Exception as e:
        print(f"FAILED: {e}")
    
if __name__ == "__main__":
    asyncio.run(main())
