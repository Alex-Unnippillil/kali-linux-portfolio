import fs from 'fs/promises';
import path from 'path';

const CATALOG_DIR = path.join(process.cwd(), 'plugins', 'catalog');
const ALLOWED_SANDBOXES = new Set(['worker', 'iframe']);

async function loadManifests() {
  const entries = await fs.readdir(CATALOG_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name);
}

async function validateManifest(filename) {
  const fullPath = path.join(CATALOG_DIR, filename);
  const errors = [];

  try {
    const raw = await fs.readFile(fullPath, 'utf8');
    let manifest;
    try {
      manifest = JSON.parse(raw);
    } catch (err) {
      errors.push(`✖ ${filename}: invalid JSON (${err instanceof Error ? err.message : String(err)})`);
      return errors;
    }

    const id = manifest?.id;
    const sandbox = manifest?.sandbox;
    const code = manifest?.code;

    const expectedId = path.parse(filename).name;
    if (typeof id !== 'string' || id.trim().length === 0) {
      errors.push(`✖ ${filename}: missing string "id" field`);
    } else if (id !== expectedId) {
      errors.push(`✖ ${filename}: id "${id}" must match file name "${expectedId}"`);
    }

    if (!ALLOWED_SANDBOXES.has(sandbox)) {
      errors.push(
        `✖ ${filename}: sandbox must be one of ${Array.from(ALLOWED_SANDBOXES)
          .map((s) => `"${s}"`)
          .join(', ')}`,
      );
    }

    if (typeof code !== 'string' || code.trim().length === 0) {
      errors.push(`✖ ${filename}: missing plugin code string`);
    }

    if (typeof code === 'string' && sandbox === 'worker') {
      const unsafeWorkerRefs = ['window', 'document'];
      for (const ref of unsafeWorkerRefs) {
        if (code.includes(ref)) {
          errors.push(`✖ ${filename}: worker sandbox must not reference ${ref}`);
        }
      }
    }

    if (typeof code === 'string' && code.includes('</script')) {
      errors.push(`✖ ${filename}: embedded script tags are not allowed in plugin code`);
    }

    const allowedKeys = new Set(['id', 'sandbox', 'code', 'description', 'version']);
    for (const key of Object.keys(manifest)) {
      if (!allowedKeys.has(key)) {
        errors.push(`✖ ${filename}: unexpected field "${key}" not allowed in plugin manifest`);
      }
    }
  } catch (err) {
    errors.push(`✖ ${filename}: ${err instanceof Error ? err.message : String(err)}`);
  }

  return errors;
}

(async () => {
  try {
    const manifests = await loadManifests();
    const problems = [];

    for (const file of manifests) {
      const issues = await validateManifest(file);
      problems.push(...issues);
    }

    if (problems.length > 0) {
      for (const problem of problems) {
        console.error(problem);
      }
      console.error(`Plugin boundary checks failed for ${problems.length} issue${
        problems.length === 1 ? '' : 's'
      }.`);
      process.exit(1);
    } else {
      console.log(`✓ Plugin boundary checks passed (${manifests.length} manifest${
        manifests.length === 1 ? '' : 's'
      }).`);
    }
  } catch (err) {
    console.error('✖ Failed to validate plugin manifests');
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
})();
