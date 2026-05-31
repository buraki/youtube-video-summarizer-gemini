import os
import sys

def check_pillow():
    try:
        from PIL import Image, ImageDraw
        return True
    except ImportError:
        return False

def install_and_import(package):
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

if not check_pillow():
    print("Pillow not found, installing...")
    try:
        install_and_import("pillow")
    except Exception as e:
        print(f"Failed to install pillow automatically: {e}")
        print("Please install pillow manually: pip install pillow")
        sys.exit(1)

from PIL import Image, ImageDraw

os.makedirs('icons', exist_ok=True)

for size in [16, 48, 128]:
    # Transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    margin = max(1, size // 16)
    
    # Draw rounded rectangle (Gemini Sparkle theme - deep blue/purple gradient simulated or nice solid blue/purple)
    # Using #6A5ACD (Slate Blue) or #1a73e8 (Google Blue) with nice rounded corners
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=size // 4,
        fill='#1a73e8' # Google/Gemini Blue
    )
    
    # Add a glowing inner circle
    draw.ellipse(
        [size // 4, size // 4, size * 3 // 4, size * 3 // 4],
        fill='#8ab4f8' # Lighter blue
    )
    
    # Draw a sparkle star in the center
    # Sparkle / Star (Gemini icon style) using polygons
    center = size // 2
    r_outer = size // 4
    r_inner = size // 10
    
    points = [
        (center, center - r_outer), # Top
        (center + r_inner, center - r_inner),
        (center + r_outer, center), # Right
        (center + r_inner, center + r_inner),
        (center, center + r_outer), # Bottom
        (center - r_inner, center + r_inner),
        (center - r_outer, center), # Left
        (center - r_inner, center - r_inner)
    ]
    
    draw.polygon(points, fill='white')
    
    img.save(f'icons/icon-{size}.png')
    print(f'Created icons/icon-{size}.png ({size}x{size})')

print("All icons generated successfully!")
