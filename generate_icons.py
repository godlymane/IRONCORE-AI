"""Generate all Android app icon sizes from source logo."""
from PIL import Image
import os
import shutil

SOURCE = "1 (2).png"
ANDROID_RES = "android/app/src/main/res"

# Android mipmap sizes (standard launcher icon)
MIPMAP_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

# Adaptive icon foreground (with padding) - 108dp at each density
ADAPTIVE_SIZES = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}

img = Image.open(SOURCE).convert("RGBA")

# Crop to square (center crop)
w, h = img.size
s = min(w, h)
left = (w - s) // 2
top = (h - s) // 2
img_square = img.crop((left, top, left + s, top + s))

# Generate standard launcher icons (ic_launcher.png)
for folder, size in MIPMAP_SIZES.items():
    out_dir = os.path.join(ANDROID_RES, folder)
    os.makedirs(out_dir, exist_ok=True)
    resized = img_square.resize((size, size), Image.LANCZOS)
    # Save as PNG (with transparency)
    resized.save(os.path.join(out_dir, "ic_launcher.png"), "PNG")
    # Also save round version
    resized.save(os.path.join(out_dir, "ic_launcher_round.png"), "PNG")
    print(f"  {folder}: {size}x{size}")

# Generate adaptive icon foreground (ic_launcher_foreground.png)
# The foreground needs 18dp padding on each side (icon is 66% of the 108dp canvas)
for folder, canvas_size in ADAPTIVE_SIZES.items():
    out_dir = os.path.join(ANDROID_RES, folder)
    os.makedirs(out_dir, exist_ok=True)

    # Icon occupies ~66% of canvas (inner 72dp of 108dp)
    icon_size = int(canvas_size * 0.66)
    padding = (canvas_size - icon_size) // 2

    icon_resized = img_square.resize((icon_size, icon_size), Image.LANCZOS)

    # Create canvas with transparent background
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    canvas.paste(icon_resized, (padding, padding), icon_resized)
    canvas.save(os.path.join(out_dir, "ic_launcher_foreground.png"), "PNG")
    print(f"  {folder} foreground: {canvas_size}x{canvas_size}")

# Generate web icon for PWA / favicon
img_square.resize((512, 512), Image.LANCZOS).save("public/icon-512.png", "PNG")
img_square.resize((192, 192), Image.LANCZOS).save("public/icon-192.png", "PNG")
print("  Web icons: 512x512, 192x192")

# Also save to src/assets for in-app use
os.makedirs("src/assets", exist_ok=True)
img_square.resize((256, 256), Image.LANCZOS).save("src/assets/logo.png", "PNG")
print("  In-app logo: 256x256")

print("\nAll icons generated successfully!")
