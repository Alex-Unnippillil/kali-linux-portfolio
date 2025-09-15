import { readFile, writeFile } from 'fs/promises';
import path from 'path';

async function run() {
  const manifestPath = path.join(process.cwd(), 'public', 'manifest.webmanifest');
  const cssPath = path.join(process.cwd(), 'styles', 'globals.css');
  let accent = '#1793d1';
  try {
    const css = await readFile(cssPath, 'utf8');
    const match = css.match(/:root\s*{[^}]*--color-accent:\s*(#[0-9a-fA-F]{6})/);
    if (match) accent = match[1];
  } catch {}

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.theme_color = accent;
  manifest.background_color = accent;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Updated manifest colors to ${accent}`);
}

run().catch(err => {
  console.error('Failed to update manifest', err);
  process.exit(1);
});
