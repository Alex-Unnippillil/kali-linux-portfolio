import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifestPath = path.join(__dirname, '..', 'components', 'ui', 'icons', 'manifest.json');
const outputPath = path.join(__dirname, '..', 'public', 'icon-gallery.html');

function escapeHtml(value = '') {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderAttributes(attrs = {}) {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ` ${key}="${value}"`)
    .join('');
}

function renderSvg(definition) {
  const title = escapeHtml(definition.title || definition.name);
  const paths = (definition.paths || [])
    .map(({ d, ...rest }) => `<path d="${d}"${renderAttributes(rest)} />`)
    .join('');
  const lines = (definition.lines || [])
    .map(({ x1, y1, x2, y2, ...rest }) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${renderAttributes(rest)} />`)
    .join('');
  const circles = (definition.circles || [])
    .map(({ cx, cy, r, ...rest }) => `<circle cx="${cx}" cy="${cy}" r="${r}"${renderAttributes(rest)} />`)
    .join('');

  return `
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="img"
      aria-label="${title}"
    >
      <title>${title}</title>
      ${paths}
      ${lines}
      ${circles}
    </svg>
  `;
}

function renderGallery(manifest) {
  const items = manifest
    .map(
      (definition) => `
      <div class="icon">
        <div class="icon__preview">${renderSvg(definition)}</div>
        <div class="icon__meta">
          <strong>${escapeHtml(definition.name)}</strong>
          ${definition.title ? `<span>${escapeHtml(definition.title)}</span>` : ''}
        </div>
      </div>
    `,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Icon Gallery</title>
    <style>
      :root {
        color-scheme: dark light;
      }
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        margin: 0 auto;
        padding: 2rem 1.5rem 4rem;
        max-width: 960px;
        color: #111827;
        background: #f9fafb;
      }
      h1 {
        margin-bottom: 0.25rem;
      }
      p.description {
        margin-top: 0;
        color: #4b5563;
      }
      .icon-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 1.5rem;
        margin-top: 2rem;
      }
      .icon {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        border-radius: 0.75rem;
        background: white;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
      }
      .icon__preview svg {
        display: block;
        width: 64px;
        height: 64px;
      }
      .icon__meta {
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.875rem;
        color: #1f2937;
      }
      .icon__meta span {
        color: #6b7280;
      }
      @media (prefers-color-scheme: dark) {
        body {
          background: #0f172a;
          color: #e2e8f0;
        }
        p.description {
          color: #94a3b8;
        }
        .icon {
          background: #111827;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.4);
        }
        .icon__meta {
          color: #e2e8f0;
        }
        .icon__meta span {
          color: #94a3b8;
        }
      }
    </style>
  </head>
  <body>
    <h1>Icon Gallery</h1>
    <p class="description">Generated from <code>components/ui/icons/manifest.json</code>. Each icon is rendered at 64px using the shared 24px stroke.</p>
    <div class="icon-grid">
      ${items}
    </div>
  </body>
</html>`;
}

async function build() {
  const raw = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  const html = renderGallery(manifest);
  await fs.writeFile(outputPath, html, 'utf8');
  console.log(`Icon gallery written to ${outputPath}`);
}

build().catch((error) => {
  console.error('Failed to build icon gallery');
  console.error(error);
  process.exit(1);
});
