#!/usr/bin/env python3
"""
Generate placeholder images for decoded email fixtures.
Creates simple SVG images for logos and QR codes referenced in the emails.
"""

import os
from pathlib import Path


def create_qr_code_svg(output_path, size=180):
    """Create a simple QR code placeholder SVG."""
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="{size}" height="{size}" fill="white"/>

  <!-- QR Code pattern (simplified placeholder) -->
  <g fill="black">
    <!-- Corner markers -->
    <rect x="10" y="10" width="40" height="40" fill="black"/>
    <rect x="15" y="15" width="30" height="30" fill="white"/>
    <rect x="20" y="20" width="20" height="20" fill="black"/>

    <rect x="130" y="10" width="40" height="40" fill="black"/>
    <rect x="135" y="15" width="30" height="30" fill="white"/>
    <rect x="140" y="20" width="20" height="20" fill="black"/>

    <rect x="10" y="130" width="40" height="40" fill="black"/>
    <rect x="15" y="135" width="30" height="30" fill="white"/>
    <rect x="20" y="140" width="20" height="20" fill="black"/>

    <!-- Data pattern (random blocks) -->
    <rect x="60" y="20" width="10" height="10"/>
    <rect x="75" y="20" width="10" height="10"/>
    <rect x="90" y="20" width="10" height="10"/>
    <rect x="105" y="20" width="10" height="10"/>

    <rect x="65" y="35" width="10" height="10"/>
    <rect x="80" y="35" width="10" height="10"/>
    <rect x="95" y="35" width="10" height="10"/>
    <rect x="110" y="35" width="10" height="10"/>

    <rect x="60" y="50" width="10" height="10"/>
    <rect x="70" y="50" width="10" height="10"/>
    <rect x="85" y="50" width="10" height="10"/>
    <rect x="100" y="50" width="10" height="10"/>
    <rect x="115" y="50" width="10" height="10"/>

    <rect x="65" y="65" width="10" height="10"/>
    <rect x="90" y="65" width="10" height="10"/>
    <rect x="105" y="65" width="10" height="10"/>
    <rect x="120" y="65" width="10" height="10"/>

    <rect x="60" y="80" width="10" height="10"/>
    <rect x="75" y="80" width="10" height="10"/>
    <rect x="95" y="80" width="10" height="10"/>
    <rect x="110" y="80" width="10" height="10"/>
    <rect x="130" y="80" width="10" height="10"/>

    <rect x="20" y="95" width="10" height="10"/>
    <rect x="70" y="95" width="10" height="10"/>
    <rect x="85" y="95" width="10" height="10"/>
    <rect x="100" y="95" width="10" height="10"/>
    <rect x="135" y="95" width="10" height="10"/>

    <rect x="25" y="110" width="10" height="10"/>
    <rect x="60" y="110" width="10" height="10"/>
    <rect x="75" y="110" width="10" height="10"/>
    <rect x="90" y="110" width="10" height="10"/>
    <rect x="120" y="110" width="10" height="10"/>
    <rect x="140" y="110" width="10" height="10"/>

    <rect x="65" y="125" width="10" height="10"/>
    <rect x="80" y="125" width="10" height="10"/>
    <rect x="100" y="125" width="10" height="10"/>
    <rect x="130" y="125" width="10" height="10"/>

    <rect x="60" y="140" width="10" height="10"/>
    <rect x="85" y="140" width="10" height="10"/>
    <rect x="110" y="140" width="10" height="10"/>
    <rect x="135" y="140" width="10" height="10"/>

    <rect x="70" y="155" width="10" height="10"/>
    <rect x="95" y="155" width="10" height="10"/>
    <rect x="120" y="155" width="10" height="10"/>
    <rect x="145" y="155" width="10" height="10"/>
  </g>

  <!-- Warning overlay -->
  <text x="{size/2}" y="{size/2 + 30}" text-anchor="middle" font-family="Arial" font-size="12" fill="red" font-weight="bold">FAKE QR</text>
  <text x="{size/2}" y="{size/2 + 45}" text-anchor="middle" font-family="Arial" font-size="10" fill="red">TEST ONLY</text>
</svg>'''

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"✓ Created QR code: {output_path}")


def create_amazon_logo_svg(output_path, width=120, height=40):
    """Create a simple Amazon-style logo placeholder."""
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{width}" height="{height}" fill="#232f3e"/>
  <text x="{width/2}" y="{height/2 + 8}" text-anchor="middle" font-family="Arial" font-size="24" fill="white" font-weight="bold">amazon</text>
  <path d="M 20,{height-8} Q {width/2},{height-2} {width-20},{height-8}" stroke="#FF9900" stroke-width="3" fill="none"/>
</svg>'''

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"✓ Created Amazon logo: {output_path}")


def create_google_logo_svg(output_path, width=120, height=40):
    """Create a simple Google-style logo placeholder."""
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{width}" height="{height}" fill="white"/>
  <text x="10" y="28" font-family="Arial" font-size="28" font-weight="bold">
    <tspan fill="#4285F4">G</tspan>
    <tspan fill="#EA4335">o</tspan>
    <tspan fill="#FBBC05">o</tspan>
    <tspan fill="#4285F4">g</tspan>
    <tspan fill="#34A853">l</tspan>
    <tspan fill="#EA4335">e</tspan>
  </text>
</svg>'''

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"✓ Created Google logo: {output_path}")


def create_microsoft_logo_svg(output_path, width=100, height=100):
    """Create a simple Microsoft logo placeholder."""
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{width}" height="{height}" fill="white"/>
  <!-- Microsoft 4-square logo -->
  <rect x="15" y="15" width="35" height="35" fill="#F25022"/>
  <rect x="55" y="15" width="35" height="35" fill="#7FBA00"/>
  <rect x="15" y="55" width="35" height="35" fill="#00A4EF"/>
  <rect x="55" y="55" width="35" height="35" fill="#FFB900"/>
</svg>'''

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"✓ Created Microsoft logo: {output_path}")


def create_paypal_logo_svg(output_path, width=120, height=40):
    """Create a simple PayPal-style logo placeholder."""
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{width}" height="{height}" fill="white"/>
  <text x="{width/2}" y="{height/2 + 8}" text-anchor="middle" font-family="Arial" font-size="20" font-weight="bold">
    <tspan fill="#003087">Pay</tspan>
    <tspan fill="#009cde">Pal</tspan>
  </text>
</svg>'''

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"✓ Created PayPal logo: {output_path}")


def create_bank_logo_svg(output_path, width=120, height=40):
    """Create a generic bank logo placeholder."""
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{width}" height="{height}" fill="#003366"/>
  <text x="{width/2}" y="{height/2 + 8}" text-anchor="middle" font-family="Arial" font-size="18" fill="white" font-weight="bold">SECURE BANK</text>
</svg>'''

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"✓ Created Bank logo: {output_path}")


def create_dhl_logo_svg(output_path, width=100, height=40):
    """Create a simple DHL-style logo placeholder."""
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{width}" height="{height}" fill="#FFCC00"/>
  <text x="{width/2}" y="{height/2 + 10}" text-anchor="middle" font-family="Arial" font-size="28" fill="#D40511" font-weight="bold">DHL</text>
</svg>'''

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"✓ Created DHL logo: {output_path}")


def main():
    """Generate all placeholder images for email fixtures."""
    script_dir = Path(__file__).parent

    print("Generating placeholder images for email fixtures...")
    print("="*80)

    # Create images directory
    images_dir = script_dir / "images"
    images_dir.mkdir(exist_ok=True)

    # Generate logos
    create_amazon_logo_svg(images_dir / "amazon_logo.svg")
    create_google_logo_svg(images_dir / "google_logo.svg")
    create_microsoft_logo_svg(images_dir / "microsoft_logo.svg")
    create_paypal_logo_svg(images_dir / "paypal_logo.svg")
    create_bank_logo_svg(images_dir / "bank_logo.svg")
    create_dhl_logo_svg(images_dir / "dhl_logo.svg")

    # Generate QR code for phishing_007
    qr_dir = script_dir / "phishing_007_qr_payment"
    qr_dir.mkdir(exist_ok=True)
    create_qr_code_svg(qr_dir / "qr_code.svg")

    # Also create a PNG-named version (even though it's SVG) for compatibility
    create_qr_code_svg(qr_dir / "qr.png.svg")

    print("="*80)
    print(f"\n✓ Image generation complete!")
    print(f"  Images saved to: {images_dir}")
    print(f"  QR code saved to: {qr_dir}")
    print("\nNote: All images are SVG format with warning labels indicating they are test fixtures.")


if __name__ == '__main__':
    main()
