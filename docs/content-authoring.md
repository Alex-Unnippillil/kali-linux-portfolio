# Content Authoring Guide

The desktop help drawer and other documentation surfaces render content
using a Markdown+MDX pipeline backed by `remark` and `rehype`. This guide
captures the supported features and conventions so new docs remain
consistent and accessible.

## Markdown Basics

- Content is parsed with [GitHub-Flavored Markdown (GFM)](https://github.github.com/gfm/).
- Standard constructs—headings, emphasis, lists, block quotes, and tables—render as expected.
- Raw HTML is stripped during sanitization. Prefer Markdown equivalents or
  reusable components.

Wrap prose in short paragraphs and keep headings sequential (`h2`, then
`h3`, etc.) to preserve a logical outline for screen readers.

## Footnotes

Footnotes use the `[^label]` reference syntax and a matching definition at
the end of the document.

```md
A sentence with a reference to more detail.[^1]

[^1]: Expanded explanation or citation.
```

When rendered, the pipeline converts the definitions into the
`<Footnotes>` component (`components/content/Footnotes.tsx`). It outputs a
semantic `<section role="doc-endnotes">` with numbered entries and
keyboard-focusable backlinks.

- Readers can activate the superscript reference (`[^1]`) to jump to the
  endnote.
- Each endnote includes one or more “Back to content” links so keyboard
  users can return to the original paragraph without losing context.
- Inline footnotes (`^[text here]`) are also supported and follow the same
  navigation pattern.

Avoid repeating information in footnotes that should live in the main
body. Reserve them for citations, definitions, or optional detail.

## Component Usage

Markdown files can embed approved React components by authoring MDX tags.
If you need a new component, add it under `components/content/` and update
`MarkdownContent` (`components/content/Markdown.tsx`) to register it.
Coordinate with maintainers before introducing bespoke presentation so the
help surface stays lightweight.

## Accessibility Checklist

- Headings form a logical outline without skipping levels.
- Links describe their destination; avoid “click here”.
- Footnote definitions contain complete sentences so they make sense when
  read by screen readers out of context.
- Use ordered lists for sequences and unordered lists for grouped items.
- Keep line length reasonable—approximately 80 characters per line—by
  letting the renderer manage layout (do not insert manual `<br>` tags).

Following these guidelines keeps authored content readable, consistent,
and accessible across keyboard and assistive technology workflows.
