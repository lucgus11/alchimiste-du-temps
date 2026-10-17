#!/usr/bin/env python3
"""Génère les icônes PWA (pixel art) dans public/icons. Usage : python3 tools/make-icons.py"""
import math
import os

from PIL import Image

N = 64  # grille logique
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(OUT, exist_ok=True)

img = Image.new("RGBA", (N, N))
px = img.load()


def put(x, y, c):
    if 0 <= x < N and 0 <= y < N:
        px[x, y] = c


def rect(x, y, w, h, c):
    for j in range(h):
        for i in range(w):
            put(x + i, y + j, c)


def hexc(s):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), 255)


# Fond : bandes violettes
bands = ["#0d0720", "#110926", "#150b2c", "#1a0f35", "#1f1240", "#241649", "#2a1a52", "#321f60"]
for i, b in enumerate(bands):
    rect(0, i * (N // len(bands)), N, N // len(bands), hexc(b))

# Étoiles
for x, y, c in [(6, 8, "#9d8fd6"), (14, 18, "#ffffff"), (52, 10, "#ffffff"), (58, 24, "#9d8fd6"),
                (9, 36, "#9d8fd6"), (56, 40, "#ffffff"), (22, 6, "#9d8fd6"), (44, 5, "#9d8fd6"),
                (4, 22, "#ffffff"), (60, 6, "#9d8fd6")]:
    put(x, y, hexc(c))

# Étincelle principale (croix dorée)
gold, pale = hexc("#ffd86b"), hexc("#fff6d0")
cx, cy = 32, 13
for d in range(-4, 5):
    put(cx + d, cy, gold)
    put(cx, cy + d, gold)
for d in range(-2, 3):
    put(cx + d, cy, pale)
    put(cx, cy + d, pale)
put(cx, cy, hexc("#ffffff"))
for x, y in [(21, 10), (43, 17), (24, 20), (41, 9)]:
    put(x, y, gold)
    put(x - 1, y, pale)
    put(x + 1, y, pale)
    put(x, y - 1, pale)
    put(x, y + 1, pale)

# Flammes
SURF, TOP, BOT = 27, 27, 50
for i in range(7):
    x = 17 + i * 5
    h = 5 + (i * 3) % 4
    rect(x, 55 - h, 4, h, hexc("#e8505b"))
    rect(x + 1, 55 - h + 1, 2, h - 1, hexc("#ff9a3c"))
    rect(x + 1, 55 - h // 2, 2, h // 2, hexc("#ffd86b"))
rect(15, 55, 34, 3, hexc("#4a2f22"))
rect(15, 55, 34, 1, hexc("#6b4531"))

# Chaudron
dark, mid, light, shade = hexc("#2c2547"), hexc("#3a3159"), hexc("#4b4170"), hexc("#1f1936")
outline = hexc("#0d0818")


def half_width(y):
    t = (y - TOP) / (BOT - TOP)
    if t < 0.35:
        return round(22 - (0.35 - t) * 8)
    u = (t - 0.35) / 0.65
    return round(12 + 10 * math.sqrt(max(0.0, 1 - u * u)))


rect(15, 47, 5, 6, outline)
rect(16, 47, 3, 5, dark)
rect(44, 47, 5, 6, outline)
rect(45, 47, 3, 5, dark)

for y in range(TOP, BOT):
    hw = half_width(y)
    x0, x1 = 32 - hw, 32 + hw
    rect(x0, y, x1 - x0, 1, dark)
    rect(x0 + 1, y, 3, 1, light)
    rect(x0 + 4, y, 3, 1, mid)
    rect(x1 - 6, y, 5, 1, shade)
    put(x0, y, outline)
    put(x1 - 1, y, outline)
bw = half_width(BOT - 1)
rect(32 - bw, BOT - 1, bw * 2, 1, outline)

# Rune lumineuse
rune = hexc("#8ff5e6")
rect(31, 38, 3, 1, rune)
rect(32, 38, 1, 7, rune)
rect(29, 41, 7, 1, rune)

# Surface du liquide
def ellipse(cx, cy, rx, ry, c):
    for dy in range(-ry, ry + 1):
        half = round(rx * math.sqrt(max(0.0, 1 - (dy * dy) / (ry * ry + 0.0001))))
        rect(cx - half, cy + dy, half * 2 + 1, 1, c)


ellipse(32, SURF + 1, 25, 5, outline)
ellipse(32, SURF + 1, 24, 4, hexc("#5d4f8a"))
ellipse(32, SURF, 22, 3, hexc("#3d3260"))
ellipse(32, SURF, 21, 3, hexc("#3cc5b4"))
rect(20, SURF - 1, 8, 1, hexc("#63e6d4"))
rect(36, SURF + 1, 7, 1, hexc("#63e6d4"))
rect(30, SURF + 2, 4, 1, hexc("#8ff5e6"))
rect(8, SURF + 4, 48, 1, hexc("#8d7ec4"))

# Bulles
bub = hexc("#b9fff4")
for bx, by in [(24, 21), (38, 19), (31, 23)]:
    put(bx - 1, by, bub)
    put(bx + 1, by, bub)
    put(bx, by - 1, bub)
    put(bx, by + 1, bub)
put(37, 18, hexc("#ffffff"))

def padded(art, pad):
    """Agrandit le canevas en répliquant les bords (zone de sécurité des icônes « maskable »)."""
    w = art.width + pad * 2
    out = Image.new("RGBA", (w, w))
    out.paste(art, (pad, pad))
    for i in range(pad):
        out.paste(art.crop((0, 0, art.width, 1)), (pad, i))
        out.paste(art.crop((0, art.height - 1, art.width, art.height)), (pad, pad + art.height + i))
    for i in range(pad):
        out.paste(out.crop((pad, 0, pad + 1, w)), (i, 0))
        out.paste(out.crop((pad + art.width - 1, 0, pad + art.width, w)), (pad + art.width + i, 0))
    return out


def save(image, size, name, resample):
    image.resize((size, size), resample).convert("RGB").save(os.path.join(OUT, name), optimize=True)
    print("ok", name)


for size, name in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png"), (32, "favicon-32.png")]:
    save(img, size, name, Image.NEAREST)

big = padded(img, 16).resize((96 * 6, 96 * 6), Image.NEAREST)
save(big, 512, "icon-maskable-512.png", Image.BOX)
