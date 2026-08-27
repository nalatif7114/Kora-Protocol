import os
import math
from PIL import Image, ImageDraw, ImageFont

WIDTH = 880
HEIGHT = 440
FRAMES_COUNT = 40
FPS = 25
DURATION_PER_FRAME = 1000 // FPS  # 40ms per frame

# Load default font
try:
    font_bold = ImageFont.truetype("arialbd.ttf", 12)
    font_small = ImageFont.truetype("arial.ttf", 10)
    font_title = ImageFont.truetype("arialbd.ttf", 14)
    font_large = ImageFont.truetype("arialbd.ttf", 20)
    font_mono = ImageFont.truetype("consola.ttf", 10)
except Exception:
    font_bold = ImageFont.load_default()
    font_small = ImageFont.load_default()
    font_title = ImageFont.load_default()
    font_large = ImageFont.load_default()
    font_mono = ImageFont.load_default()

def lerp(a, b, t):
    return a + (b - a) * t

def bezier_point(p0, p1, p2, t):
    x = (1 - t)**2 * p0[0] + 2 * (1 - t) * t * p1[0] + t**2 * p2[0]
    y = (1 - t)**2 * p0[1] + 2 * (1 - t) * t * p1[1] + t**2 * p2[1]
    return (x, y)

def draw_3d_cube(draw, cx, cy, size, color_top, color_left, color_right, wireframe_color):
    h = size * 0.58
    w = size * 0.86
    # Top face
    top = [
        (cx, cy - h),
        (cx + w, cy - h * 0.5),
        (cx, cy),
        (cx - w, cy - h * 0.5)
    ]
    draw.polygon(top, fill=color_top, outline=wireframe_color)
    
    # Left face
    left = [
        (cx - w, cy - h * 0.5),
        (cx, cy),
        (cx, cy + h),
        (cx - w, cy + h * 0.5)
    ]
    draw.polygon(left, fill=color_left, outline=wireframe_color)
    
    # Right face
    right = [
        (cx, cy),
        (cx + w, cy - h * 0.5),
        (cx + w, cy + h * 0.5),
        (cx, cy + h)
    ]
    draw.polygon(right, fill=color_right, outline=wireframe_color)

def draw_octahedron(draw, cx, cy, size, rot_angle):
    # 3D Octahedron projection
    # Vertices
    top = (cx, cy - size * 1.3)
    bottom = (cx, cy + size * 1.3)
    
    # Equatorial 4 vertices rotating
    pts = []
    for i in range(4):
        ang = rot_angle + i * (math.pi / 2)
        px = cx + size * 1.2 * math.cos(ang)
        py = cy + size * 0.5 * math.sin(ang)
        pts.append((px, py))
    
    # Front faces
    colors = [
        ((14, 165, 233, 180), (2, 132, 199, 180)),
        ((3, 105, 161, 180), (14, 116, 144, 180)),
        ((15, 23, 42, 180), (30, 41, 59, 180)),
        ((56, 189, 248, 180), (2, 132, 199, 180))
    ]
    
    # Draw top triangles
    for i in range(4):
        p1 = pts[i]
        p2 = pts[(i + 1) % 4]
        # Only draw if front facing (simple cross product / y ordering)
        if (p2[0] - p1[0]) * (top[1] - p1[1]) - (p2[1] - p1[1]) * (top[0] - p1[0]) > 0:
            c = colors[i][0]
            draw.polygon([top, p1, p2], fill=c[:3], outline=(56, 189, 248))
            draw.polygon([bottom, p1, p2], fill=colors[i][1][:3], outline=(30, 58, 138))

def render_frame(frame_idx, total_frames):
    t = frame_idx / total_frames
    phase = t * 2 * math.pi
    
    img = Image.new("RGB", (WIDTH, HEIGHT), color=(9, 13, 22))
    draw = ImageDraw.Draw(img)
    
    # 1. Background subtle radial gradient & architectural grid
    center_x, center_y = 440, 220
    
    # Grid lines
    for x in range(40, WIDTH, 40):
        draw.line([(x, 30), (x, HEIGHT - 30)], fill=(19, 30, 54), width=1)
    for y in range(40, HEIGHT, 40):
        draw.line([(30, y), (WIDTH - 30, y)], fill=(19, 30, 54), width=1)
        
    # 2. Risk Perimeter Ellipse (Health Factor Guardrail)
    rx, ry = 360, 160
    draw.ellipse(
        [center_x - rx, center_y - ry, center_x + rx, center_y + ry],
        outline=(30, 58, 138),
        width=1
    )
    draw.ellipse(
        [center_x - rx - 2, center_y - ry - 2, center_x + rx + 2, center_y + ry + 2],
        outline=(16, 185, 129),
        width=1
    )
    
    # 3. Sentinel Beacons moving along the Risk Perimeter
    for i in range(3):
        beacon_angle = phase * 0.5 + i * (2 * math.pi / 3)
        bx = center_x + rx * math.cos(beacon_angle)
        by = center_y + ry * math.sin(beacon_angle)
        draw.ellipse([bx - 4, by - 4, bx + 4, by + 4], fill=(16, 185, 129), outline=(255, 255, 255))
    
    # 4. Capital Flow Trajectories & Animated Pulses
    core_pos = (center_x, center_y)
    
    nodes = {
        "weth": {"pos": (170, 120), "name": "WETH", "sub": "$3,150 • 3.85% APY", "color": (14, 165, 233)},
        "wbtc": {"pos": (140, 220), "name": "WBTC", "sub": "$64.2k • 2.95% APY", "color": (245, 158, 11)},
        "usdc": {"pos": (170, 320), "name": "USDC", "sub": "$1.00 • 4.68% APY", "color": (16, 185, 129)},
        "collateral": {"pos": (710, 120), "name": "COLLATERAL", "sub": "75% LTV • 80% LT", "color": (6, 182, 212)},
        "borrow": {"pos": (710, 320), "name": "BORROW HUB", "sub": "5.82% APR • 67.2% UTIL", "color": (56, 189, 248)}
    }
    
    # Draw trajectory curves
    trajectories = [
        (nodes["weth"]["pos"], (300, 150), core_pos, (2, 132, 199)),
        (nodes["wbtc"]["pos"], (280, 220), core_pos, (2, 132, 199)),
        (nodes["usdc"]["pos"], (300, 290), core_pos, (16, 185, 129)),
        (core_pos, (580, 150), nodes["collateral"]["pos"], (6, 182, 212)),
        (core_pos, (580, 290), nodes["borrow"]["pos"], (56, 189, 248))
    ]
    
    for p0, p1, p2, col in trajectories:
        # Draw curve segments
        pts = [bezier_point(p0, p1, p2, st / 30.0) for st in range(31)]
        for k in range(len(pts) - 1):
            draw.line([pts[k], pts[k+1]], fill=col, width=1)
        
        # Draw animated flow pulse particles along trajectory
        for p_idx in range(4):
            progress = (t + p_idx * 0.25) % 1.0
            px, py = bezier_point(p0, p1, p2, progress)
            draw.ellipse([px - 2.5, py - 2.5, px + 2.5, py + 2.5], fill=(255, 255, 255), outline=col)
            draw.ellipse([px - 4, py - 4, px + 4, py + 4], outline=col)

    # 5. Concentric Ray Index Rings (1e27 Precision)
    ring_radius_x = 120 + math.sin(phase) * 3
    ring_radius_y = 52 + math.sin(phase) * 1.5
    draw.ellipse(
        [center_x - ring_radius_x, center_y - ring_radius_y, center_x + ring_radius_x, center_y + ring_radius_y],
        outline=(51, 65, 85),
        width=1
    )
    draw.ellipse(
        [center_x - ring_radius_x * 1.25, center_y - ring_radius_y * 1.25, center_x + ring_radius_x * 1.25, center_y + ring_radius_y * 1.25],
        outline=(30, 41, 59),
        width=1
    )
    
    # 6. Central Liquidity Reserve Core (3D Octahedron & Pulsing Cash Sphere)
    pulse_size = 28 + math.sin(phase * 2) * 2.5
    # Inner glowing cash sphere
    draw.ellipse(
        [center_x - pulse_size, center_y - pulse_size, center_x + pulse_size, center_y + pulse_size],
        fill=(14, 165, 233),
        outline=(56, 189, 248)
    )
    # Core Octahedron Crystal Hull
    draw_octahedron(draw, center_x, center_y, 45, phase)
    
    # Core telemetry tag
    draw.rectangle([center_x - 65, center_y + 60, center_x + 65, center_y + 88], fill=(15, 23, 42), outline=(56, 189, 248), width=1)
    draw.text((center_x, center_y + 66), "RESERVE CORE", fill=(255, 255, 255), font=font_bold, anchor="mt")
    draw.text((center_x, center_y + 77), "$18.7M Cash • 1e27 Ray", fill=(148, 163, 184), font=font_small, anchor="mt")

    # 7. Protocol Asset & Functional Nodes
    for key, node in nodes.items():
        nx, ny = node["pos"]
        col = node["color"]
        
        # 3D Node Housing
        draw_3d_cube(
            draw, nx, ny, 22,
            color_top=(19, 30, 54),
            color_left=(15, 23, 42),
            color_right=(10, 15, 30),
            wireframe_color=col
        )
        
        # Inner Status Core
        draw.ellipse([nx - 5, ny - 5, nx + 5, ny + 5], fill=col, outline=(255, 255, 255))
        
        # Node Label Card
        is_left = nx < center_x
        card_x = nx - 120 if is_left else nx + 25
        card_w = 115
        card_h = 36
        draw.rectangle(
            [card_x, ny - 18, card_x + card_w, ny + 18],
            fill=(15, 23, 42),
            outline=(30, 41, 59),
            width=1
        )
        # Accent indicator
        draw.rectangle([card_x, ny - 18, card_x + 3, ny + 18], fill=col)
        draw.text((card_x + 8, ny - 12), node["name"], fill=(255, 255, 255), font=font_bold)
        draw.text((card_x + 8, ny + 2), node["sub"], fill=(148, 163, 184), font=font_small)

    # 8. Technical HUD Overlay Header & Footer
    # Header HUD
    draw.rectangle([20, 15, WIDTH - 20, 42], fill=(15, 23, 42), outline=(30, 41, 59))
    draw.ellipse([32, 25, 40, 33], fill=(16, 185, 129))
    draw.text((50, 22), "KORA PROTOCOL", fill=(255, 255, 255), font=font_bold)
    draw.text((165, 23), "/ MODULAR LENDING INFRASTRUCTURE", fill=(148, 163, 184), font=font_mono)
    draw.text((WIDTH - 35, 23), "RAY 1e27 PRECISION", fill=(56, 189, 248), font=font_mono, anchor="rt")

    # Footer HUD
    draw.rectangle([20, HEIGHT - 42, WIDTH - 20, HEIGHT - 15], fill=(15, 23, 42), outline=(30, 41, 59))
    draw.text((35, HEIGHT - 33), "EVM PARIS 0.8.24", fill=(148, 163, 184), font=font_mono)
    draw.text((160, HEIGHT - 33), "• 100% SOLVENT (HF 1.84)", fill=(16, 185, 129), font=font_mono)
    draw.text((345, HEIGHT - 33), "• 90/90 PASSING INVARIANT & UNIT TESTS", fill=(148, 163, 184), font=font_mono)
    draw.text((WIDTH - 35, HEIGHT - 33), "TWO-KINK DYNAMIC RATE MODEL", fill=(56, 189, 248), font=font_mono, anchor="rt")
    
    return img

def main():
    assets_dir = os.path.join(os.path.dirname(__file__), "..", "docs", "assets")
    os.makedirs(assets_dir, exist_ok=True)
    
    print(f"Generating {FRAMES_COUNT} frames for Kora 3D Hero visualization...")
    frames = []
    for i in range(FRAMES_COUNT):
        frame = render_frame(i, FRAMES_COUNT)
        frames.append(frame)
        if (i + 1) % 10 == 0 or i == FRAMES_COUNT - 1:
            print(f"Rendered frame {i + 1}/{FRAMES_COUNT}")
    
    # 1. Save static PNG fallback (Frame 0)
    png_path = os.path.join(assets_dir, "kora-readme-hero.png")
    frames[0].save(png_path, "PNG", optimize=True)
    print(f"[OK] Saved static fallback: {png_path} ({os.path.getsize(png_path) // 1024} KB)")
    
    # 2. Save animated WebP
    webp_path = os.path.join(assets_dir, "kora-readme-hero.webp")
    frames[0].save(
        webp_path,
        "WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=DURATION_PER_FRAME,
        loop=0,
        quality=85,
        method=4
    )
    print(f"[OK] Saved animated WebP: {webp_path} ({os.path.getsize(webp_path) // 1024} KB)")

    # 3. Save optimized GIF
    gif_path = os.path.join(assets_dir, "kora-readme-hero.gif")
    # Convert frames to adaptive palette for crisp small GIF
    paletted_frames = [f.convert("P", palette=Image.ADAPTIVE, colors=128) for f in frames]
    paletted_frames[0].save(
        gif_path,
        "GIF",
        save_all=True,
        append_images=paletted_frames[1:],
        duration=DURATION_PER_FRAME,
        loop=0,
        optimize=True
    )
    print(f"[OK] Saved animated GIF: {gif_path} ({os.path.getsize(gif_path) // 1024} KB)")
    print("All assets successfully generated!")

if __name__ == "__main__":
    main()
