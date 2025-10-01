# Font loading strategy

This project renders a lot of multilingual security content, so the font stack has been updated to balance coverage, performance, and theming.

## Baseline font stacks

- `styles/typography.css` defines CSS custom properties for Latin, CJK, and RTL scripts. The defaults prioritise Ubuntu (to match the Kali look) and progressively fall back to platform UI fonts and the open Noto families. The same variables power `body`, language-specific selectors, and a shared `.font-root` class, so we do not get baseline jumps when theme switching.
- Monospace selections use high-metric-compatible developer fonts (`JetBrains Mono`, `Fira Code`, `Source Code Pro`) before falling back to system monospace faces.

## Lazy loading additional glyph coverage

- `utils/fontLoader.ts` inspects visible text and only requests heavy font payloads when they are needed. The detector watches:
  - CJK ranges (Han, Hiragana, Katakana, compatibility ideographs).
  - RTL ranges for Hebrew and Arabic scripts.
- When characters from those ranges appear, the loader injects a Google Fonts stylesheet for the relevant Noto font family. Requests are throttled to animation frames so rapid DOM mutations do not spam the network.
- We preconnect to `fonts.gstatic.com` before requesting the stylesheet to avoid a separate TCP/TLS handshake when a new script is detected.

## Caching behaviour

- Loaded font groups are cached in `localStorage` (`kali-font-loader:v1`). On repeat visits we immediately rehydrate the same font groups so rerenders stay stable even before new content triggers detection.
- The loader guards against unavailable APIs (e.g. older browsers without `MutationObserver`) and simply performs a best-effort scan of the initial DOM.

## Performance considerations

- Latin content continues to use the locally bundled Ubuntu subset, keeping the initial bundle lean.
- Additional font CSS is only fetched when the page contains matching characters, cutting down on unused bytes for users who only browse English content.
- Media swapping is handled by setting `link.media="print"` until the stylesheet finishes loading. This prevents blocking render.
- The typography CSS relies on CSS variables so theme switches keep the same metrics regardless of which font is active.

## Testing

- Unit tests (`__tests__/fontLoader.test.ts`) verify the Unicode-range detection logic using sample CJK and RTL strings.
- Manual checks should include loading content (e.g. Notes app, documents, or blog posts) with Chinese, Japanese, Arabic, and Hebrew strings to confirm the loader activates and the UI maintains its baseline alignment.
