import { access, mkdir, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const src = 'dist/utils/gamepad.js';
const destDir = 'public/vendor';
const dest = `${destDir}/gamepad.js`;

try {
  await access(src, constants.F_OK);
} catch {
  console.warn(`Warning: ${src} not found. Skipping copy.`);
  process.exit(0);
}

await mkdir(destDir, { recursive: true });
await copyFile(src, dest);
console.log(`Copied ${src} to ${dest}`);
