"""Generate all PWA/web icon sizes from source logo."""
from PIL import Image
import os

SOURCE = "1 (2).png"
OUT_DIR = "public/icons"
os.makedirs(OUT_DIR, exist_ok=True)

img = Image.open(SOURCE).convert("RGBA")
w, h = img.size
s = min(w, h)
left = (w - s) // 2
top = (h - s) // 2
img_square = img.crop((left, top, left + s, top + s))

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

for size in SIZES:
    resized = img_square.resize((size, size), Image.LANCZOS)
    resized.save(os.path.join(OUT_DIR, f"icon-{size}x{size}.png"), "PNG")
    print(f"  icons/icon-{size}x{size}.png")

# Apple touch icon
img_square.resize((180, 180), Image.LANCZOS).save(os.path.join(OUT_DIR, "apple-touch-icon.png"), "PNG")
print("  icons/apple-touch-icon.png (180x180)")

# Favicon as PNG (32x32)
img_square.resize((32, 32), Image.LANCZOS).save("public/favicon.png", "PNG")
print("  favicon.png (32x32)")

print("\nAll web icons generated!")
