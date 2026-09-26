import asyncio
import os
import ee
from datetime import date
import cv2
import numpy as np
import rasterio

from backend.app.gee_client import initialize_gee
from backend.app.pipelines.optical import run_optical_pipeline
from backend.app.pipelines.sar import run_sar_pipeline

def dummy_send_status(msg):
    print(f"STATUS: {msg}")

async def main():
    print("Initializing GEE...")
    initialize_gee()
    
    # Create a ~2x2 km polygon in San Francisco
    # -122.4194, 37.7749 is SF
    geom = ee.Geometry.Polygon([[
        [-122.43, 37.77],
        [-122.41, 37.77],
        [-122.41, 37.79],
        [-122.43, 37.79],
        [-122.43, 37.77]
    ]])
    
    date_start = date(2023, 1, 1)
    date_end = date(2023, 1, 31)
    
    print("\n--- Running Optical Pipeline ---")
    opt_res = run_optical_pipeline(geom, date_start, date_end, dummy_send_status)
    print(f"Optical Date MS: {opt_res['acquisition_date_ms']}")
    print(f"Optical Thumb URL: {opt_res['thumb_url']}")
    
    print("\n--- Running SAR Pipeline ---")
    sar_res = run_sar_pipeline(geom, opt_res["acquisition_date_ms"], dummy_send_status)
    print(f"SAR Thumb URL: {sar_res['thumb_url']}")
    
    print("\n[VERIFICATION PASSED] Both pipelines returned URLs successfully.")
    
if __name__ == "__main__":
    asyncio.run(main())
