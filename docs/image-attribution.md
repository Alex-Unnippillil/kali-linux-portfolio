# Image attribution guidelines

Use the `Figure` component for screenshots and photos to keep visual content informative and correctly attributed.

## Credit line patterns

- **Screenshots:** `Screenshot of <software/tool> by <source> (<license>)`
- **Photos:** `Photo by <photographer> via <source> (<license>)`

Include an optional "Learn more" link when additional context or the original source should be referenced.

Each figure should provide:

- Descriptive alt text
- A caption if helpful
- Credit and license information

Example:

```tsx
<Figure
  src="/img/example.png"
  alt="Example output"
  caption="Example output from the tool"
  credit="Screenshot by Offensive Security"
  license={{ name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" }}
  learnMoreUrl="https://example.com/source"
/>
```
