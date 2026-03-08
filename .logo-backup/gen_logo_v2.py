"""IronCore Fit Logo V2 — Premium product logo that SELLS.
Bold, iconic, instantly recognizable. Think Nike swoosh meets Peloton.
A fierce angular 'iron flame' mark — no text on icon, just the symbol.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os

W = H = 1024
cx, cy = W // 2, H // 2

# Colors
RED = (220, 38, 38)
RED_LIGHT = (239, 68, 68)
RED_HOT = (248, 113, 113)
RED_DARK = (153, 27, 27)
RED_DEEP = (127, 29, 29)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
DARK_GREY = (18, 18, 18)

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3))


# ===================== ICON VERSION (app icon) =====================
def draw_icon(size=1024):
    """The mark: An angular, fierce shield-flame hybrid.
    Represents iron strength + AI precision. No text."""

    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    s = size / 1024  # scale factor

    # --- Background: rounded square with dark gradient ---
    # Fill with near-black
    draw.rounded_rectangle([(0, 0), (size-1, size-1)], radius=int(200*s), fill=DARK_GREY)

    # Subtle radial gradient overlay (brighter center)
    gradient = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gradient)
    for r in range(int(400*s), 0, -1):
        alpha = int(15 * (r / (400*s)))
        gd.ellipse(
            [(cx*s - r, cy*s - r), (cx*s + r, cy*s + r)],
            fill=(255, 255, 255, alpha)
        )
    img = Image.alpha_composite(img, gradient)
    draw = ImageDraw.Draw(img)

    # --- The Mark: Shield + Flame + Dumbbell fusion ---
    # Main shape: angular shield pointing down, with a flame-like cutout

    # Outer shield shape
    shield_pts = [
        (cx*s, int(120*s)),           # top center (peak)
        (cx*s + int(320*s), int(250*s)),  # top right
        (cx*s + int(280*s), int(680*s)),  # mid right
        (cx*s, int(900*s)),           # bottom point
        (cx*s - int(280*s), int(680*s)),  # mid left
        (cx*s - int(320*s), int(250*s)),  # top left
    ]

    # Draw shield with gradient fill (scanline)
    # First, fill the bounding area
    min_y = int(120*s)
    max_y = int(900*s)

    for y in range(min_y, max_y):
        t = (y - min_y) / (max_y - min_y)
        # Color gradient: bright red top -> deep red bottom
        color = lerp_color(RED_HOT, RED_DEEP, t)

        # Find left and right edges of shield at this y
        intersections = []
        for i in range(len(shield_pts)):
            p1 = shield_pts[i]
            p2 = shield_pts[(i + 1) % len(shield_pts)]
            y1, y2 = p1[1], p2[1]
            if (y1 <= y < y2) or (y2 <= y < y1):
                if y2 != y1:
                    t_edge = (y - y1) / (y2 - y1)
                    x = p1[0] + t_edge * (p2[0] - p1[0])
                    intersections.append(x)

        if len(intersections) >= 2:
            intersections.sort()
            draw.line([(int(intersections[0]), y), (int(intersections[-1]), y)],
                      fill=color + (255,))

    # Shield outline with glow
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.polygon(shield_pts, outline=RED_LIGHT + (200,))
    for i in range(1, 6):
        expanded = []
        for px, py in shield_pts:
            dx = px - cx*s
            dy = py - cy*s
            dist = math.sqrt(dx*dx + dy*dy)
            if dist > 0:
                expanded.append((px + dx/dist * i * 2, py + dy/dist * i * 2))
            else:
                expanded.append((px, py))
        glow_draw.polygon(expanded, outline=RED + (max(10, 80 - i*15),))
    glow = glow.filter(ImageFilter.GaussianBlur(4))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # --- Inner cutout: flame/energy mark ---
    # A bold angular "flame" or "power" symbol carved into the shield
    # This creates the negative space that makes it iconic

    inner_flame = [
        (cx*s, int(220*s)),                    # top
        (cx*s + int(80*s), int(350*s)),        # right shoulder
        (cx*s + int(140*s), int(340*s)),       # right wing out
        (cx*s + int(60*s), int(520*s)),        # right mid
        (cx*s + int(120*s), int(500*s)),       # right prong
        (cx*s, int(780*s)),                    # bottom point
        (cx*s - int(120*s), int(500*s)),       # left prong
        (cx*s - int(60*s), int(520*s)),        # left mid
        (cx*s - int(140*s), int(340*s)),       # left wing out
        (cx*s - int(80*s), int(350*s)),        # left shoulder
    ]

    # Fill inner flame with dark (creates the cutout effect)
    draw.polygon(inner_flame, fill=DARK_GREY + (255,))

    # Add a bright red stroke inside the cutout
    draw.polygon(inner_flame, outline=RED + (180,))

    # --- Lightning bolt / power line through the center ---
    bolt = [
        (cx*s - int(30*s), int(280*s)),
        (cx*s + int(50*s), int(460*s)),
        (cx*s + int(10*s), int(460*s)),
        (cx*s + int(40*s), int(700*s)),
        (cx*s - int(50*s), int(480*s)),
        (cx*s - int(10*s), int(480*s)),
    ]

    # Bolt with gradient
    bolt_layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bolt_layer)
    bd.polygon(bolt, fill=RED_HOT + (255,))

    # White hot center line
    bolt_center = [
        (cx*s - int(15*s), int(310*s)),
        (cx*s + int(35*s), int(460*s)),
        (cx*s + int(5*s), int(460*s)),
        (cx*s + int(25*s), int(670*s)),
        (cx*s - int(35*s), int(485*s)),
        (cx*s - int(5*s), int(485*s)),
    ]
    bd.polygon(bolt_center, fill=(255, 200, 180, 120))

    img = Image.alpha_composite(img, bolt_layer)
    draw = ImageDraw.Draw(img)

    # --- Top highlight (metallic sheen) ---
    highlight = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    hd = ImageDraw.Draw(highlight)
    for y in range(min_y, min_y + int(200*s)):
        t = (y - min_y) / (200*s)
        alpha = int(40 * (1 - t))
        # Get shield width at this y
        intersections = []
        for i in range(len(shield_pts)):
            p1 = shield_pts[i]
            p2 = shield_pts[(i + 1) % len(shield_pts)]
            y1, y2 = p1[1], p2[1]
            if (y1 <= y < y2) or (y2 <= y < y1):
                if y2 != y1:
                    t_edge = (y - y1) / (y2 - y1)
                    x = p1[0] + t_edge * (p2[0] - p1[0])
                    intersections.append(x)
        if len(intersections) >= 2:
            intersections.sort()
            hd.line([(int(intersections[0]+10*s), y), (int(intersections[-1]-10*s), y)],
                    fill=(255, 255, 255, alpha))
    img = Image.alpha_composite(img, highlight)

    return img


# ===================== FULL LOGO (with text) =====================
def draw_full_logo(size=1024):
    """Icon + IRONCORE FIT wordmark below."""
    img = Image.new('RGBA', (size, size), BLACK + (255,))

    # Draw icon smaller, centered in top portion
    icon = draw_icon(int(size * 0.65))
    icon_x = (size - icon.width) // 2
    icon_y = int(size * 0.05)
    img.paste(icon, (icon_x, icon_y), icon)

    draw = ImageDraw.Draw(img)

    # Text
    try:
        font_bold = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", int(size * 0.065))
        font_thin = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", int(size * 0.045))
    except:
        font_bold = ImageFont.load_default()
        font_thin = font_bold

    text_y = int(size * 0.78)

    # IRONCORE
    draw.text((size // 2, text_y), "IRONCORE", fill=WHITE, font=font_bold, anchor="mm")

    # Accent line
    line_y = text_y + int(size * 0.035)
    draw.line([(size//2 - int(size*0.12), line_y), (size//2 + int(size*0.12), line_y)],
              fill=RED + (180,), width=max(1, int(size * 0.002)))

    # FIT
    draw.text((size // 2, text_y + int(size * 0.075)), "FIT", fill=RED, font=font_thin, anchor="mm")

    return img


# ===================== GENERATE ALL =====================
out_dir = "C:/Users/devda/iron-ai/.logo-backup"

# Master icon (no text, no background rounding for flexibility)
icon_1024 = draw_icon(1024)
icon_1024.save(os.path.join(out_dir, "ironcore-icon-v2-1024.png"))
print("Saved master icon 1024")

# Full logo with text
full = draw_full_logo(1024)
full_rgb = full.convert('RGB')
full_rgb.save(os.path.join(out_dir, "logo.png"))
print("Saved logo.png (with text)")

# Web icons
for name, sz in [("icon-512.png", 512), ("icon-192.png", 192), ("favicon.png", 48)]:
    resized = icon_1024.resize((sz, sz), Image.LANCZOS).convert('RGB')
    resized.save(os.path.join(out_dir, name))
    print(f"Saved {name}")

# Android mipmaps
android_sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
for density, sz in android_sizes.items():
    # Square icon
    sq = icon_1024.resize((sz, sz), Image.LANCZOS).convert('RGB')
    sq.save(os.path.join(out_dir, f"ic_launcher_{density}.png"))

    # Round icon
    rd = icon_1024.resize((sz, sz), Image.LANCZOS).convert('RGBA')
    mask = Image.new('L', (sz, sz), 0)
    ImageDraw.Draw(mask).ellipse([(0, 0), (sz, sz)], fill=255)
    result = Image.new('RGBA', (sz, sz), (0, 0, 0, 0))
    result.paste(rd, mask=mask)
    result.save(os.path.join(out_dir, f"ic_launcher_round_{density}.png"))

    print(f"Saved mipmap-{density}")

print("\nV2 logos generated!")
