import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function render(mods) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Module Report</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; }
    h2 { margin-top: 1.5rem; }
  </style>
</head>
<body>
  <h1>Module Report</h1>
  ${mods
    .map(
      (m) => `
  <section role="region" aria-labelledby="${m.id}-title" id="${m.id}">
    <h2 id="${m.id}-title">${escapeHtml(m.name)}</h2>
    <p>${escapeHtml(m.description)}</p>
    <h3>Logs</h3>
    <ul>
      ${m.log
        .map((l) => `<li>[${escapeHtml(l.level)}] ${escapeHtml(l.message)}</li>`)
        .join('')}
    </ul>
    <h3>Results</h3>
    <ul>
      ${m.results
        .map((r) => `<li>${escapeHtml(r.target)}: ${escapeHtml(r.status)}</li>`)
        .join('')}
    </ul>
  </section>`
    )
    .join('')}
</body>
</html>`;
}

async function build() {
  const modulesPath = path.join(__dirname, '..', 'data', 'module-index.json');
  const outputPath = path.join(__dirname, '..', 'public', 'module-report.html');
  const raw = await fs.readFile(modulesPath, 'utf8');
  const mods = JSON.parse(raw);
  const html = render(mods);
  await fs.writeFile(outputPath, html, 'utf8');
  console.log(`Module report written to ${outputPath}`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
