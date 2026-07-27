import { access, mkdir, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

async function safeCopy(src, dest) {
  try {
    await access(src, constants.F_OK);
  } catch {
    console.warn(`Warning: ${src} not found. Skipping copy.`);
    return;
  }
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(src, dest);
  console.log(`Copied ${src} to ${dest}`);
}

await safeCopy('dist/utils/gamepad.js', 'public/vendor/gamepad.js');
await safeCopy('robots.txt', 'public/robots.txt');

try {
  await access('out', constants.F_OK);
  await safeCopy('robots.txt', 'out/robots.txt');
} catch {
  // out directory not present; nothing to copy
}
