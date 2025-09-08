# Font Loading Strategies

To reduce Flash of Unstyled Text (FOUT) and Flash of Invisible Text (FOIT), consider the following approaches:

- **Self-host critical fonts** and serve them with long-lived cache headers to avoid network delays.
- **Preload and preconnect** to font assets using `<link rel="preload">` and `<link rel="preconnect">` so browsers fetch resources sooner.
- **Use `font-display`**, such as `swap` or `optional`, to ensure text remains visible while fonts load.
- **Subset and compress fonts** to include only necessary glyphs, keeping payloads small.
- **Provide comprehensive system font fallbacks** so content remains legible even if custom fonts fail to load.

These techniques help maintain readable content and minimize visual shifts during font loading.
