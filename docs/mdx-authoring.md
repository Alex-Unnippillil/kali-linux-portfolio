# MDX authoring guidelines

This project renders documentation with MDX so contributors can mix Markdown content with React components. The new image
wrapper in `components/docs/MDXComponents.tsx` helps us keep responsive behaviour, maintain aspect ratios, and use lightweight
blur placeholders without having to hand-roll `<Image />` usage in every page.

## Use the shared image wrapper

- Prefer standard Markdown syntax (`![Alt text](./path/to/image.png)`) when referencing local assets. The MDX compiler will
  route the resulting `<img>` node through our wrapper automatically.
- When you need custom markup, import `MDXComponents` and spread it into your MDX layout so `<img>` tags resolve to the shared
  component.
- Remote or CMS-hosted images should include metadata in the document’s frontmatter so the wrapper can determine sizing without
  layout shifts.

## Declaring image metadata in frontmatter

Add an `images` block to the document’s frontmatter with the resolved path as the key. Width and height are required so Next.js
can pre-compute the aspect ratio. Optional blur hashes improve perceived performance.

```yaml
---
title: Example guide
images:
  /docs/hero.png:
    width: 1280
    height: 720
    blurDataURL: data:image/png;base64,AAA
---
```

Wrap the rendered content in `MDXImageMetadataProvider` to expose this metadata to the runtime:

```tsx
import MDXComponents, { MDXImageMetadataProvider } from '@/components/docs/MDXComponents';

export default function DocPage({ frontmatter, children }) {
  return (
    <MDXImageMetadataProvider images={frontmatter.images}>
      <article className="prose">
        <MDXProvider components={MDXComponents}>{children}</MDXProvider>
      </article>
    </MDXImageMetadataProvider>
  );
}
```

The provider is optional for purely static imports because Next.js includes width and height metadata automatically.

## Verify responsive behaviour

1. Run `yarn dev` and open the document in your browser.
2. Resize the viewport or toggle device emulation in DevTools; images should scale smoothly without overflowing their container.
3. Confirm that the blur placeholder appears before the high-resolution source loads on slower network throttles.
4. Repeat the check in a static export build when adding new assets to ensure the same behaviour on production hosting.

Following these steps keeps docs pages consistent with the desktop UI and avoids layout shifts when new articles land.
