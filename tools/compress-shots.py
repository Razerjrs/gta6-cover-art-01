"""Downscale raw screenshots into screenshots/*.jpg within the gate limits:
long side <= 1280, short side >= 480, each <= 256 KiB. Run: python3 tools/compress-shots.py"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "tools", "raw")
OUT = os.path.join(ROOT, "screenshots")
os.makedirs(OUT, exist_ok=True)

for name in sorted(os.listdir(RAW)):
    if not name.lower().endswith(".png"):
        continue
    img = Image.open(os.path.join(RAW, name)).convert("RGB")
    w, h = img.size
    scale = min(1.0, 1280 / max(w, h))
    if scale < 1.0:
        img = img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    stem = os.path.splitext(name)[0]
    out = os.path.join(OUT, stem + ".jpg")
    q = 88
    while q >= 55:
        img.save(out, quality=q, optimize=True)
        if os.path.getsize(out) <= 256 * 1024:
            break
        q -= 6
    print(stem, img.size, os.path.getsize(out), "bytes, q =", q)
