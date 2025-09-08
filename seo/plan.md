# SEO Plan

## JSON-LD Samples

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Alex Unnippillil's Portfolio",
  "url": "https://unnippillil.com"
}
```

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Alex Unnippillil",
  "url": "https://unnippillil.com"
}
```

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Alex Unnippillil",
  "url": "https://unnippillil.com",
  "logo": "https://unnippillil.com/images/logos/logo_1200.png"
}
```

For deep routes, breadcrumbs are emitted like:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "apps", "item": "https://unnippillil.com/apps" },
    { "@type": "ListItem", "position": 2, "name": "metasploit", "item": "https://unnippillil.com/apps/metasploit" }
  ]
}
```

## Validation Steps

1. `yarn dev` to start the development server.
2. Visit any page and view source to confirm presence of canonical, meta robots and Open Graph tags.
3. Generate an OG image by visiting `/api/og?title=Hello` and confirm an image is returned.
4. Use Google's [Rich Results Test](https://search.google.com/test/rich-results) and paste the page URL or HTML snippet to validate the WebSite, Person, Organization and BreadcrumbList JSON‑LD.
5. Inspect Open Graph tags using the [Open Graph Debugger](https://developers.facebook.com/tools/debug/).
