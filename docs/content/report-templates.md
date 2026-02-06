# Report template authoring guidelines

This project now supports reusable report templates that mix Markdown/MDX content with structured metadata. Use the guidance below whenever you add or update a template so that the build-time registry stays consistent.

## Directory layout

```
templates/
  reports/
    <template-id>.mdx          # Human-readable content with placeholders
    <template-id>.json         # Metadata describing layout, cover fields, and sections
public/
  images/
    report-templates/
      <template-id>.svg        # Optional preview thumbnail used by the registry
```

Keep filenames lowercase with hyphen-separated identifiers. The JSON filename **must** match the MDX template to keep imports simple (`security-overview.mdx` ⇔ `security-overview.json`).

## Metadata schema

Each `templates/reports/<template-id>.json` file should follow the structure consumed by `utils/reportTemplates.ts`:

- **id** – Unique slug that also matches the filename. Used as the primary key for lookup.
- **name** – Marketing-friendly label displayed in selection UIs.
- **description** – One or two sentences summarizing when to use the template.
- **layout** – Object describing the page format. Supported keys:
  - `format` (e.g., `A4`, `US-Letter`)
  - `orientation` (`portrait` or `landscape`)
  - `columns` (integer)
  - `theme` (free-form string describing the visual theme)
  - `margin` (optional string such as `1in` or `24mm`)
- **cover** – Array of cover field descriptors. Each item exposes:
  - `field` – Data key referenced in MDX as `{{cover.<field>}}`
  - `label` – Friendly label for builders/editors
  - `type` – Expected data type (`string`, `date`, `image`, or `markdown`)
  - `required` – Defaults to `true`. Set to `false` if the field is optional.
  - `helperText` – Optional hint surfaced by future editors.
- **sections** – Array of ordered content blocks rendered after the cover. Every section includes:
  - `slug`, `title`, and `description`
  - `required` – Defaults to `true`; mark optional sections with `false`
  - `variables` – Array describing the data keys used by the MDX file. Two shapes are available:
    - Scalar variables: `{ "key": "executiveSummary", "type": "markdown", "required": true }`
    - Collections: `{ "key": "timeline", "type": "collection", "itemFields": [ ... ] }`
      - Collection `itemFields` can define nested requirements such as `timestamp`, `description`, or `owner`
- **preview.thumbnail** – Relative path (usually `"/images/report-templates/<template-id>.svg"`) rendered by the template picker.

The registry automatically derives `requiredVariables` and `optionalVariables` by combining section and cover configuration, so keeping these arrays accurate avoids runtime validation gaps.

## MDX authoring tips

- Placeholders follow a Mustache-inspired convention (e.g., `{{executiveSummary}}`, `{{#each keyFindings}}`). They are treated as text today and can be swapped out by the rendering pipeline later.
- Wrap optional content with `{{#if ...}}` directives to show intent, even if the control flow is handled upstream.
- Keep headings consistent with the metadata sections so the preview registry stays intuitive for end users.
- Include HTML comments at the top of the MDX file that point to the matching JSON metadata for maintainers.

### Example snippet

```mdx
# {{cover.title}}

**Client:** {{cover.client}}  \\
**Assessment Date:** {{cover.assessmentDate}}

## Executive Summary

{{executiveSummary}}

## Key Findings

{{#each keyFindings}}
- **{{title}}** ({{severity}})
  - {{impact}}
  - {{remediation}}
{{/each}}
```

## Registry integration

The registry that powers template discovery lives at `utils/reportTemplates.ts`.

- Import the new metadata JSON in this file and add it to the `rawTemplates` array.
- The helper builds the `templatePath`, `previewThumbnail`, and `requiredVariables` list automatically. Keep metadata accurate so these derived values stay trustworthy.
- Exposed helpers:
  - `reportTemplates` – Full definitions, including layout, cover, sections, and derived variable lists
  - `listReportTemplateSummaries()` – Lightweight objects suitable for selection menus
  - `getReportTemplate(id)` – Lookup helper for runtime rendering

If your template requires additional runtime assets (images, charts, etc.), colocate them under `public/images/report-templates/<template-id>/` and reference them with relative paths inside the MDX body or metadata.

## Preview thumbnails

Use lightweight SVGs for thumbnails so they load quickly and mirror the dark-terminal aesthetic of the portfolio. Include descriptive `<title>` and `<desc>` elements for accessibility. The registry does not attempt to validate the asset, so ensure the file path resolves to avoid broken previews.

## Validation checklist

1. Run `yarn lint` to catch TypeScript or linting errors introduced by the new registry or templates.
2. Run `yarn test` to ensure existing unit tests still pass.
3. Manually open the MDX files to verify placeholders align with the metadata keys.
4. Update this document whenever the metadata contract evolves.
