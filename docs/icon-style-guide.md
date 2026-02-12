# Icon Style Guide

This guide defines the geometry for application icons and the base icon set included in this repository.

## 20 px Icons
- **Artboard:** 20 × 20
- **Padding:** 2 px on all sides (drawing area 16 × 16)
- **Stroke width:** 1.5 px
- **Corner radius:** 2 px for any shapes with corners
- **Notes:** Align paths to the pixel grid using whole or 0.5 px coordinates so the icons render crisply at 1×, 2× and 3×.

## 24 px Icons
- **Artboard:** 24 × 24
- **Padding:** 2 px on all sides (drawing area 20 × 20)
- **Stroke width:** 2 px
- **Corner radius:** 2 px for any shapes with corners
- **Notes:** Use whole‑pixel coordinates to maintain sharp rendering at 1×, 2× and 3×.

## Base Icon Set
The base icons follow the above rules and live in `public/icons/20` and `public/icons/24`:

- plus
- minus
- check
- close

All icons use `stroke-linecap="round"` and `stroke-linejoin="round"` so they scale cleanly across resolutions.
