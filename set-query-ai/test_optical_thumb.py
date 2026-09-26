import asyncio
import os
import urllib.request
import cv2
import numpy as np
from datetime import date, timedelta
import ee

from backend.app.gee_client import initialize_gee
from backend.app.pipelines.optical import run_optical_pipeline

def dummy_send_status(msg):
    print(f"[STATUS] {msg}")

async def main():
    print("Initializing Google Earth Engine...")
    initialize_gee()

    # Connaught Place, New Delhi (exact area from user screenshot)
    # Lat: 28.625 to 28.640, Lon: 77.210 to 77.225 (~1.5 x 1.5 km)
    geom = ee.Geometry.Polygon([[
        [77.205, 28.620],
        [77.230, 28.620],
        [77.230, 28.645],
        [77.205, 28.645],
        [77.205, 28.620]
    ]])

    # Query last 60 days
    date_end = date.today()
    date_start = date_end - timedelta(days=60)
    print(f"Testing Optical Pipeline for Connaught Place ({date_start} to {date_end})...")

    res = run_optical_pipeline(geom, date_start, date_end, dummy_send_status)
    thumb_url = res["thumb_url"]
    print(f"\nThumbnail URL generated:\n{thumb_url}\n")

    # Download the thumbnail image
    out_path = "output_optical_preview.png"
    urllib.request.urlretrieve(thumb_url, out_path)
    print(f"Saved thumbnail to {out_path}")

    # Analyze the image quality
    arr_bgr = cv2.imread(out_path)
    if arr_bgr is None:
        raise ValueError(f"Failed to read downloaded image from {out_path}")
    arr = cv2.cvtColor(arr_bgr, cv2.COLOR_BGR2RGB)
    total_pixels = arr.shape[0] * arr.shape[1]

    # Check for pure black voids (R=0, G=0, B=0)
    black_pixels = np.sum(np.all(arr == [0, 0, 0], axis=-1))
    black_pct = (black_pixels / total_pixels) * 100

    # Check for near-black voids (intensity < 10)
    near_black = np.sum(np.mean(arr, axis=-1) < 10)
    near_black_pct = (near_black / total_pixels) * 100

    # Check for saturated white cloud pixels (intensity > 245)
    white_pixels = np.sum(np.mean(arr, axis=-1) > 245)
    white_pct = (white_pixels / total_pixels) * 100

    mean_rgb = np.mean(arr, axis=(0, 1))

    print("\n--- Image Quality Analysis ---")
    print(f"Dimensions: {arr.shape[1]}x{arr.shape[0]} px")
    print(f"Pure Black (0,0,0) Voids: {black_pixels} px ({black_pct:.2f}%)")
    print(f"Near Black (<10) Voids: {near_black} px ({near_black_pct:.2f}%)")
    print(f"Saturated White (>245): {white_pixels} px ({white_pct:.2f}%)")
    print(f"Mean RGB: R={mean_rgb[0]:.1f}, G={mean_rgb[1]:.1f}, B={mean_rgb[2]:.1f}")

    if black_pct < 2.0 and white_pct < 5.0:
        print("\n[SUCCESS] Optical image is seamless, clear, and free of voids/clouds!")
    else:
        print("\n[WARNING] Some voids or cloud artifacts detected.")

if __name__ == "__main__":
    asyncio.run(main())
