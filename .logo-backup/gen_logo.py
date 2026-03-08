"""Generate IronCore Fit logo - sleek IC monogram with hexagonal frame."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os

W = H = 1024
cx, cy = W // 2, H // 2 - 30

# Colors
RED = (220, 38, 38)
RED_LIGHT = (239, 68, 68)
RED_DARK = (153, 27, 27)
RED_DIM = (220, 38, 38, 100)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

def hex_points(center_x, center_y, radius, sides=6):
    pts = []
    for i in range(sides):
        angle = (math.pi / 3) * i - math.pi / 2
        x = center_x + radius * math.cos(angle)
        y = center_y + radius * math.sin(angle)
        pts.append((x, y))
    return pts

# ---- Main image ----
img = Image.new('RGBA', (W, H), BLACK + (255,))
draw = ImageDraw.Draw(img)

# ---- Hexagonal frame (glow layer) ----
glow_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow_layer)

hex_outer = hex_points(cx, cy, 360)
hex_inner = hex_points(cx, cy, 340)

# Thick glow hex
gd.polygon(hex_outer, outline=RED + (180,))
for w in range(1, 15):
    alpha = max(10, 180 - w * 14)
    gd.polygon(hex_outer, outline=RED[:3] + (alpha,))
    # Expand slightly for glow
    expanded = hex_points(cx, cy, 360 + w)
    gd.polygon(expanded, outline=RED[:3] + (alpha // 2,))

glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(8))
img = Image.alpha_composite(img, glow_layer)
draw = ImageDraw.Draw(img)

# Sharp hex lines
draw.polygon(hex_outer, outline=RED + (255,))
draw.polygon(hex_inner, outline=RED[:3] + (60,))

# ---- Corner accent marks ----
# Top-left
draw.line([(cx - 300, cy - 280), (cx - 200, cy - 280)], fill=RED[:3] + (100,), width=2)
draw.line([(cx - 300, cy - 280), (cx - 300, cy - 180)], fill=RED[:3] + (100,), width=2)
draw.ellipse([(cx - 304, cy - 284), (cx - 296, cy - 276)], fill=RED)
# Bottom-right
draw.line([(cx + 300, cy + 280), (cx + 200, cy + 280)], fill=RED[:3] + (100,), width=2)
draw.line([(cx + 300, cy + 280), (cx + 300, cy + 180)], fill=RED[:3] + (100,), width=2)
draw.ellipse([(cx + 296, cy + 276), (cx + 304, cy + 284)], fill=RED)

# ---- IC Monogram ----

# "I" bar - bold with serif-like caps
i_left = cx - 185
i_right = cx - 115
i_inner_l = cx - 165
i_inner_r = cx - 135
i_top = cy - 150
i_bot = cy + 150
i_cap = 40

# I shape
i_poly = [
    (i_left, i_top),        # TL
    (i_right, i_top),       # TR
    (i_right, i_top + i_cap),  # TR inner
    (i_inner_r, i_top + i_cap),
    (i_inner_r, i_bot - i_cap),
    (i_right, i_bot - i_cap),
    (i_right, i_bot),       # BR
    (i_left, i_bot),        # BL
    (i_left, i_bot - i_cap),
    (i_inner_l, i_bot - i_cap),
    (i_inner_l, i_top + i_cap),
    (i_left, i_top + i_cap),
]

# Gradient simulation for I
for y_off in range(i_bot - i_top):
    t = y_off / (i_bot - i_top)
    r = int(RED_LIGHT[0] * (1 - t) + RED_DARK[0] * t)
    g = int(RED_LIGHT[1] * (1 - t) + RED_DARK[1] * t)
    b = int(RED_LIGHT[2] * (1 - t) + RED_DARK[2] * t)
    y = i_top + y_off
    draw.line([(i_left, y), (i_right, y)], fill=(r, g, b, 255))

# Cut out the inside of I
draw.rectangle([(i_inner_r, i_top + i_cap), (i_right - 1, i_bot - i_cap)], fill=BLACK)
draw.rectangle([(i_left + 1, i_top + i_cap), (i_inner_l, i_bot - i_cap)], fill=BLACK)

# Redraw I with proper polygon for clean edges
img2 = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d2 = ImageDraw.Draw(img2)

# I gradient fill
for y_off in range(300):
    t = y_off / 300
    r = int(RED_LIGHT[0] * (1 - t) + RED_DARK[0] * t)
    g = int(RED_LIGHT[1] * (1 - t) + RED_DARK[1] * t)
    b = int(RED_LIGHT[2] * (1 - t) + RED_DARK[2] * t)
    y = i_top + y_off
    # Top cap
    if y_off < i_cap:
        d2.line([(i_left, y), (i_right, y)], fill=(r, g, b, 255))
    # Stem
    elif y_off < 300 - i_cap:
        d2.line([(i_inner_l, y), (i_inner_r, y)], fill=(r, g, b, 255))
    # Bottom cap
    else:
        d2.line([(i_left, y), (i_right, y)], fill=(r, g, b, 255))

# "C" shape
c_left = cx + 20
c_right = cx + 185
c_inner_l = c_left + 40
c_inner_r = c_right - 15
c_top = cy - 150
c_bot = cy + 150
c_opening = 40  # thickness of C arms

for y_off in range(300):
    t = y_off / 300
    r = int(RED_LIGHT[0] * (1 - t) + RED_DARK[0] * t)
    g = int(RED_LIGHT[1] * (1 - t) + RED_DARK[1] * t)
    b = int(RED_LIGHT[2] * (1 - t) + RED_DARK[2] * t)
    y = c_top + y_off
    # Top arm
    if y_off < c_opening:
        d2.line([(c_left, y), (c_right, y)], fill=(r, g, b, 255))
    # Left vertical bar
    elif y_off < 300 - c_opening:
        d2.line([(c_left, y), (c_inner_l, y)], fill=(r, g, b, 255))
    # Bottom arm
    else:
        d2.line([(c_left, y), (c_right, y)], fill=(r, g, b, 255))

img = Image.alpha_composite(img, img2)
draw = ImageDraw.Draw(img)

# ---- Metallic highlights on letters ----
highlight = Image.new('RGBA', (W, H), (0, 0, 0, 0))
hd = ImageDraw.Draw(highlight)
hd.rectangle([(i_left, i_top), (i_right, i_top + 4)], fill=(255, 255, 255, 40))
hd.rectangle([(c_left, c_top), (c_right, c_top + 4)], fill=(255, 255, 255, 40))
img = Image.alpha_composite(img, highlight)
draw = ImageDraw.Draw(img)

# ---- Text: IRONCORE FIT ----
try:
    font_bold = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 52)
    font_light = ImageFont.truetype("C:/Windows/Fonts/segoeuil.ttf", 52)
except:
    try:
        font_bold = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 52)
        font_light = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 52)
    except:
        font_bold = ImageFont.load_default()
        font_light = font_bold

# IRONCORE
text_y = cy + 205
draw.text((cx, text_y), "IRONCORE", fill=WHITE, font=font_bold, anchor="mm")

# Separator line
draw.line([(cx - 100, text_y + 25), (cx + 100, text_y + 25)], fill=RED[:3] + (150,), width=1)

# FIT
draw.text((cx, text_y + 60), "FIT", fill=RED, font=font_light, anchor="mm")

# ---- Export all sizes ----
out_dir = os.path.dirname(os.path.abspath(__file__))
base_dir = "C:/Users/devda/iron-ai"

# Convert to RGB for PNG export
img_rgb = img.convert('RGB')

# Save master 1024
img_rgb.save(os.path.join(out_dir, "ironcore-logo-1024.png"), "PNG")
print("Saved 1024x1024 master")

# Icon version (no text, just the IC + hex, for app icons)
icon_img = Image.new('RGBA', (W, H), BLACK + (255,))
# Paste everything except text area
icon_img.paste(img, (0, 0))
icon_draw = ImageDraw.Draw(icon_img)
# Black out the text area
icon_draw.rectangle([(0, cy + 170), (W, H)], fill=BLACK)

# Sizes needed
sizes = {
    "icon-512.png": 512,
    "icon-192.png": 192,
    "favicon.png": 48,
}

icon_rgb = icon_img.convert('RGB')

for fname, size in sizes.items():
    resized = icon_rgb.resize((size, size), Image.LANCZOS)
    resized.save(os.path.join(out_dir, fname), "PNG")
    print(f"Saved {fname} ({size}x{size})")

# Full logo for src/assets/logo.png (with text)
logo = img_rgb.resize((512, 512), Image.LANCZOS)
logo.save(os.path.join(out_dir, "logo.png"), "PNG")
print("Saved logo.png (512x512 with text)")

# Android mipmap sizes (icon only, no text)
android_sizes = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}

for density, size in android_sizes.items():
    resized = icon_rgb.resize((size, size), Image.LANCZOS)
    out_path = os.path.join(out_dir, f"ic_launcher_{density}.png")
    resized.save(out_path, "PNG")
    print(f"Saved ic_launcher_{density}.png ({size}x{size})")

# Round version for Android
for density, size in android_sizes.items():
    resized = icon_rgb.resize((size, size), Image.LANCZOS).convert('RGBA')
    # Create circular mask
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse([(0, 0), (size, size)], fill=255)
    # Apply mask
    result = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    result.paste(resized, mask=mask)
    out_path = os.path.join(out_dir, f"ic_launcher_round_{density}.png")
    result.save(out_path, "PNG")
    print(f"Saved ic_launcher_round_{density}.png ({size}x{size})")

print("\nAll logos generated!")
