# Content authoring guidelines

These guidelines keep MDX and Markdown surfaces consistent, legible, and accessible across the Kali Linux Portfolio experience.

## Link styling reference

Links rendered inside `.mdx-content`, `.prose`, `.docs-content`, or `#docs-root` automatically receive the accessible color system defined in `styles/content.css`.

| State   | Dark / default theme | Light theme | Neon theme | Matrix theme | High contrast |
| ------- | -------------------- | ----------- | ---------- | ------------ | ------------- |
| Default | `#4DB8FF`            | `#0062B8`   | `#FF66FF`  | `#66FFBF`    | `#FFFF00`     |
| Hover   | `#86D6FF`            | `#3389E5`   | `#FF85FF`  | `#7CFFD4`    | `#FFEF5C`     |
| Active  | `#C2E9FF`            | `#0A7CD6`   | `#FF99FF`  | `#A5FFE8`    | `#FFD400`     |
| Visited | `#B889FF`            | `#5B2AA7`   | `#D9A6FF`  | `#99FF8F`    | `#FFBF33`     |

Each color combination delivers at least a 3:1 contrast ratio against its background so visited links remain legible without losing their affordance.

## Writing accessible content

- Use semantic Markdown/MDX. Prefer headings in order (`#`, `##`, `###`), descriptive link text, and bulleted lists to keep navigation friendly.
- Avoid inline color overrides or `style` attributes. They can break the shared palette above and cause contrast failures.
- Add `rel="noopener noreferrer"` on external links opened in a new tab: `[Label](https://example.com){:target="_blank" rel="noopener noreferrer"}` when using MDX.
- Keep paragraph copy short (60–90 characters per line) and use `<strong>`/`**` sparingly to avoid overwhelming emphasis.
- Supply alternative text for every image (`![Alt text](image.png "Optional caption")`).

## Layout expectations

- Wrap rich-text regions in a container with the `.mdx-content` class (or reuse the existing `.prose` utility) so the shared link styling applies automatically.
- When embedding interactive components, ensure focus management returns to the main document after dismissing a modal or overlay.
- For callout blocks, prefer existing components or Tailwind utilities that respect theme tokens instead of bespoke inline styles.

## Editorial review checklist

1. **Keyboard**: Tab through every link to confirm the new focus outline is visible and offset from surrounding text.
2. **Theme coverage**: Toggle between default, dark, neon, matrix, and high-contrast themes. Confirm link states remain above a 3:1 contrast ratio.
3. **Color scheme**: Switch the OS/browser to light and dark modes (`prefers-color-scheme`) to confirm fallbacks render correctly.
4. **Responsive**: Preview the page at 320px, 768px, and 1280px widths (browser dev tools are sufficient) to make sure the underline and outline remain visible.
5. **Touch devices**: Trigger link focus via long-press or external keyboard on a tablet/phone to confirm outlines render.
6. **Reduced motion**: Enable reduced-motion settings to make sure hover/focus transitions become instant (they do via `styles/content.css`).

Following this checklist keeps authored content accessible and consistent with the wider desktop simulation.
