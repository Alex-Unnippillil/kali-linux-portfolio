# Figlet Fonts Inventory

The Figlet utility ships with a curated set of bundled FIGlet fonts so users can switch styles without leaving the desktop shell.

## Bundled Fonts

| Font | Style Notes |
| --- | --- |
| Banner | Wide banner lettering with block serifs. |
| Big | Heavyweight capitals that fill horizontal space quickly. |
| Block | Bold sans-serif letterforms with even stroke widths. |
| Doom | Stylized angular glyphs inspired by classic demos. |
| Shadow | Tall characters with built-in drop shadows. |
| Slant | Italicized strokes that create a diagonal motion. |
| Small | Compact lettering that fits longer text in narrow windows. |
| Standard | The traditional FIGlet baseline used for compatibility tests. |

These fonts are parsed on demand inside the Figlet web worker so the main bundle stays small. The font selector grid renders a preview line for each entry and labels whether the font is monospace or proportional.

## Custom and Remote Fonts

Uploaded `.flf` files and fonts served from `/api/figlet/fonts` are cached in IndexedDB. Cached fonts are rehydrated when the app launches, so they remain available when the device is offline. Each font entry stores:

- The FIGlet font name (used to keep selections stable).
- The raw `.flf` payload.
- A monospace flag that keeps the "Monospace only" filter accurate after reloads.

Users can continue to import additional `.flf` files at runtime; every successful import is added to the cache and appears in the selector grid immediately.
