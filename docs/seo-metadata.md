# SEO metadata playbook

This project centralizes document metadata in `components/SEO/Meta`. The helper composes
page titles, descriptions, canonical URLs, and social previews so desktop windows inherit
consistent markup when rendered in the traditional pages router.

## Default behaviour

- **Title & description.** Pages inherit the site-wide title/description unless overrides
  are supplied. A provided `title` is automatically suffixed with the portfolio name.
- **Canonical URLs.** The helper joins the supplied `canonical` path with
  `https://unnippillil.com`. When omitted, it falls back to the home page URL so legacy pages
  continue to build.
- **Social previews.** Open Graph and Twitter tags reuse the resolved title, description,
  and preview image. Update `lib/seo.js` if the default image or handles change.
- **JSON-LD schema.** Two baseline snippets (`Person` + `WebSite`) ship with every page. Use
  the `jsonLd` prop to append page-specific structured data.

## Adding page metadata

```tsx
import Meta from '../components/SEO/Meta';

const ExamplePage = () => (
  <>
    <Meta
      title="Example"
      description="One sentence summary for the window content."
      canonical="/example"
      jsonLd={[
        {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Example',
          url: 'https://unnippillil.com/example',
        },
      ]}
    />
    {/* page content */}
  </>
);
```

Guidelines:

1. Keep descriptions between 140–160 characters and lead with the value proposition.
2. Canonical paths should be absolute within the domain (e.g. `/profile`).
3. Prefer `summary_large_image` thumbnails for social embeds; override the `image` prop only
   when a page requires a custom hero asset.
4. JSON-LD should mirror the visible content. When listing items, provide stable anchors in
   the `url` field (`/page#item-id`).

## Validation checklist

- Run `yarn lint` before committing to ensure JSX/TypeScript changes compile.
- Use Lighthouse or another SEO scanner against the built site to confirm the canonical URL,
  structured data, and social tags resolve as expected. (The CI environment cannot run
  Lighthouse automatically, so perform this check locally when iterating on metadata.)
- Spot-check the rendered `<head>` in a browser or with `curl -I` to verify that canonical
  links and JSON-LD payloads match the page content.
