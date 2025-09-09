import { access, mkdir, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname } from 'node:path';
import loggerModule from '../utils/logger';

const logger = loggerModule.default || loggerModule;
const src = 'dist/utils/gamepad.js';
const dest = 'public/vendor/gamepad.js';

try {
  await access(src, constants.F_OK);
} catch {
  logger.warn(`Warning: ${src} not found. Skipping copy.`);
  process.exit(0);
}

await mkdir(dirname(dest), { recursive: true });
await copyFile(src, dest);
logger.info(`Copied ${src} to ${dest}`);

