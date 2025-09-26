import { createRequire } from 'node:module';

import logger from '../../utils/logger.js';

const require = createRequire(import.meta.url);

const modules = require('../../data/module-index.json');
const { validatePublicEnv } = require('../../lib/validate.js');

if (!Array.isArray(modules)) {
  throw new Error('Expected module-index.json to export an array of modules');
}

const sanitized = validatePublicEnv({ NEXT_PUBLIC_ENABLE_ANALYTICS: 'true' });

if (typeof logger?.error !== 'function') {
  throw new Error('utils/logger.js did not expose an error function');
}

const keys = Object.keys(sanitized);
console.log(`[module-boundary] Loaded ${modules.length} modules from the catalog.`);
console.log(
  `[module-boundary] validatePublicEnv returned ${keys.length} key${keys.length === 1 ? '' : 's'}: ${
    keys.length > 0 ? keys.join(', ') : 'none'
  }.`,
);
console.log('[module-boundary] Logger export is available.');
console.log('[module-boundary] PASS');
