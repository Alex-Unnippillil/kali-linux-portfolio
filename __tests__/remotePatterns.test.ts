import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';

jest.mock('@ducanh2912/next-pwa', () => ({
  __esModule: true,
  default: () => (config: any) => config,
}));

jest.mock('@next/bundle-analyzer', () => () => (config: any) => config);

function collectHosts(): Set<string> {
  const root = path.join(__dirname, '..');
  const patterns = ['{app,apps,components,pages}/**/*.{js,jsx,ts,tsx}'];
  const files = fg.sync(patterns, {
    cwd: root,
    ignore: ['**/__tests__/**', '**/*.test.*', '**/*.spec.*'],
  });

  const hosts = new Set<string>();

  for (const file of files) {
    const abs = path.join(root, file);
    const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      if (!line.includes('https://') || !/\bsrc\b/i.test(line)) continue;
      if (/href\s*=/.test(line)) continue;
      const commentIdx = line.indexOf('//');
      const urlIdx = line.indexOf('https://');
      if (commentIdx !== -1 && commentIdx < urlIdx) continue;
      const urlRegex = /https:\/\/[^\s"'`\\]+/g;
      let match: RegExpExecArray | null;
      while ((match = urlRegex.exec(line))) {
        try {
          const domain = new URL(match[0]).hostname;
          hosts.add(domain);
        } catch {
          /* ignore invalid URLs */
        }
      }
    }
  }

  return hosts;
}

function isCovered(host: string, patterns: { hostname: string }[]): boolean {
  return patterns.some(({ hostname }) => {
    if (hostname.startsWith('*.')) {
      const base = hostname.slice(2);
      return host === base || host.endsWith(`.${base}`);
    }
    return host === hostname;
  });
}

test('remotePatterns cover referenced remote image hosts', () => {
  const config = require('../next.config.js');
  const patterns = config.images?.remotePatterns ?? [];
  const domains = config.images?.domains ?? [];

  const hosts = Array.from(collectHosts()).filter((d) => domains.includes(d));
  const missing = hosts.filter((host) => !isCovered(host, patterns));

  if (missing.length) {
    throw new Error('Missing remotePatterns for:\n' + missing.join('\n'));
  }
});

