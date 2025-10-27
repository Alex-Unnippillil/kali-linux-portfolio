# Markdown linting guide

This guide explains how to run the repository's remark-lint checks, interpret the most common accessibility warnings, and resolve them quickly.

## Run the markdown linter locally

1. Install dependencies with `yarn install --immutable` if you have not already.
2. Execute `yarn markdown:lint` from the project root.
3. Fix any issues that are reported, then rerun the command until it exits without errors.

### CI expectations

The CI workflow runs the same command and will fail the pull request when warnings are present. Running the linter locally before opening a PR avoids surprises.

## Fix common lint messages

### Headings must increment one level at a time

If you see `heading increment` warnings, ensure that heading levels do not skip (for example, avoid jumping from `##` to `####`). Always start a document with a single `#` heading, then nest subsections in order.

### Do not add punctuation to headings

The `no-heading-punctuation` rule flags headings that end with characters such as `?`, `!`, or `:`. Rewrite those headings as neutral phrases, and move punctuation into the paragraph body if needed.

### Provide meaningful alt text for images

The custom rule in this repository checks for missing or too-short image descriptions (fewer than three characters). Replace empty alt text (`![]()`) with language that communicates the purpose of the image to screen readers, for example:

```markdown
![Terminal output showing remark lint passing](./docs/assets/remark-passing.png)
```

### Keep link destinations valid

Warnings from `no-empty-url` indicate missing link targets such as `[]()` or `[label]()`. Supply a valid destination or remove the link entirely so readers do not hit dead ends.

## Use the sample content as a template

The repository includes `docs/samples/markdown-accessibility-sample.md` with a fully compliant Markdown example. Use it as a starting point when authoring new docs or tests for the lint rules.
