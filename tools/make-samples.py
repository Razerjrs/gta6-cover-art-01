"""Generate two extra sample photos (procedural sunset/neon scenes, no real people)
for the Neon Coast cover maker. Run: python3 tools/make-samples.py"""
import math, random
from PIL import Image, ImageDraw, ImageFilter

random.seed(20261121)
W, H = 1200, 900

def vgrad(w, h, stops):
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        for i in range(len(stops) - 1):
            (t0, c0), (t1, c1) = stops[i], stops[i + 1]
            if t0 <= t <= t1:
                f = (t - t0) / max(1e-6, t1 - t0)
                col = tuple(int(c0[k] + (c1[k] - c0[k]) * f) for k in range(3))
                break
        else:
            col = stops[-1][1]
        for x in range(w):
            px[x, y] = col
    return img

def sun(img, cx, cy, r, core, glow):
    d = ImageDraw.Draw(img, "RGBA")
    for rr in range(r * 3, r, -6):
        a = int(60 * (1 - rr / (r * 3)))
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=glow + (a,))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=core)

def palms(d, x, y, s, col):
    # curved trunk + drooping curved fronds (drawn as polylines along an arc)
    top_x, top_y = x + s * 0.12, y - s
    pts = []
    for t in range(9):
        f = t / 8
        pts.append((x + s * 0.12 * f + math.sin(f * 1.2) * s * 0.05, y - s * f))
    d.line(pts, fill=col, width=max(4, int(s * 0.07)))
    for a in range(-170, 30, 25):
        rad = math.radians(a)
        fr = []
        for t in range(7):
            f = t / 6
            ex = top_x + math.cos(rad) * s * 0.55 * f
            ey = top_y + math.sin(rad) * s * 0.30 * f + s * 0.28 * f * f
            fr.append((ex, ey))
        d.line(fr, fill=col, width=max(3, int(s * 0.045)))

# --- rooftop: dusk skyline, golden sun, palm silhouettes ---
img = vgrad(W, H, [(0.0, (26, 16, 64)), (0.45, (120, 48, 110)), (0.62, (255, 130, 60)), (0.75, (255, 190, 90)), (1.0, (60, 20, 50))])
sun(img, W // 2, int(H * 0.62), 90, (255, 214, 120), (255, 140, 70))
d = ImageDraw.Draw(img, "RGBA")
# skyline
x = 0
while x < W:
    bw = random.randint(60, 150); bh = random.randint(120, 330)
    d.rectangle([x, H - 260 - bh + 160, x + bw, H], fill=(24, 10, 40, 255))
    for _ in range(random.randint(6, 18)):
        wx = random.randint(x + 8, x + bw - 12); wy = random.randint(H - 260 - bh + 170, H - 40)
        d.rectangle([wx, wy, wx + 8, wy + 10], fill=(255, 200, 110, random.randint(120, 230)))
    x += bw + random.randint(4, 18)
# rooftop floor + palms (set in from the edges so the fronds read as palms)
d.rectangle([0, H - 110, W, H], fill=(18, 8, 32))
palms(d, 190, H - 100, 230, (10, 4, 20))
palms(d, W - 190, H - 100, 260, (10, 4, 20))
img = img.filter(ImageFilter.GaussianBlur(0.6))
img.save("app/samples/rooftop.jpg", quality=88)

# --- neon street: wet pavement, pink/teal glow, two walking silhouettes ---
# brighter mid-frame: big neon signs, glowing diner awning, lit street
img = vgrad(W, H, [(0.0, (16, 10, 40)), (0.45, (52, 18, 82)), (0.62, (150, 40, 120)), (0.72, (70, 22, 70)), (1.0, (20, 10, 38))])
d = ImageDraw.Draw(img, "RGBA")
# dark building edges framing the street (drawn first, signs glow over them)
for bx in [0, 330, 620, 980]:
    d.rectangle([bx, 0, bx + 200, int(H * 0.52)], fill=(12, 9, 30, 255))
# glowing diner awning across the middle
d.rectangle([0, int(H * 0.52), W, int(H * 0.60)], fill=(255, 46, 150, 255))
for xx in range(0, W, 90):
    d.polygon([(xx, int(H * 0.60)), (xx + 45, int(H * 0.60)), (xx + 45, int(H * 0.66)), (xx, int(H * 0.66))], fill=(255, 255, 255, 220) if (xx // 90) % 2 == 0 else (255, 46, 150, 255))
# neon signs (large, mid-frame)
for sx, sy, w2, h2, col in [(90, 130, 260, 80, (255, 45, 150)), (820, 110, 280, 70, (40, 230, 220)),
                            (640, 300, 220, 60, (255, 120, 40)), (80, 320, 200, 56, (40, 230, 220))]:
    for r in range(26, 0, -4):
        d.rectangle([sx - r, sy - r, sx + w2 + r, sy + h2 + r], outline=col + (int(90 - r * 3),), width=2)
    d.rectangle([sx, sy, sx + w2, sy + h2], outline=col, width=4)
# wet street
d.rectangle([0, int(H * 0.68), W, H], fill=(16, 10, 34))
for _ in range(240):
    x = random.randint(0, W); y = random.randint(int(H * 0.70), H - 6)
    col = random.choice([(255, 45, 150), (40, 230, 220), (255, 120, 40), (255, 220, 130)])
    ln = random.randint(20, 90)
    d.line([(x, y), (x + random.randint(-8, 8), y + 2)], fill=col + (random.randint(60, 180),), width=2)
# two walking silhouettes (friends, no faces)
for cx, s, col in [(W // 2 - 90, 300, (6, 4, 14)), (W // 2 + 60, 320, (8, 5, 16))]:
    d.ellipse([cx - s * 0.14, H - 560, cx + s * 0.14, H - 560 + s * 0.28], fill=col)  # head
    d.rounded_rectangle([cx - s * 0.22, H - 540, cx + s * 0.22, H - 300], radius=30, fill=col)  # body
    d.line([(cx - s * 0.1, H - 300), (cx - s * 0.16, H - 130)], fill=col, width=int(s * 0.09))
    d.line([(cx + s * 0.1, H - 300), (cx + s * 0.18, H - 130)], fill=col, width=int(s * 0.09))
img = img.filter(ImageFilter.GaussianBlur(0.8))
img.save("app/samples/neon.jpg", quality=88)
print("samples written")
