"""Tiles review stills into a labelled 2-column contact sheet.

usage: python3 scripts/sheet.py out.png a.png b.png ...
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

out, files = sys.argv[1], sys.argv[2:]
W, H, G = 960, 540, 8
cols = 2
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (W + G) + G, rows * (H + G) + G), "black")
draw = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB").resize((W, H))
    x, y = G + (i % cols) * (W + G), G + (i // cols) * (H + G)
    sheet.paste(im, (x, y))
    draw.rectangle([x, y, x + 90, y + 22], fill="black")
    draw.text((x + 6, y + 5), Path(f).stem, fill="white")
sheet.save(out)
