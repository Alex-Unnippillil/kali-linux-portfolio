import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';

type Ref = { file: string; line: number; domain: string };

function parseConfig() {
  const configPath = path.join(__dirname, '..', 'next.config.js');
  const content = fs.readFileSync(configPath, 'utf8');

  const imagesMatch = content.match(/images:\s*{[^}]*domains:\s*\[([\s\S]*?)\]/);
  const imageDomains = imagesMatch
    ? Array.from(imagesMatch[1].matchAll(/['"]([^'"]+)['"]/g)).map((m) => m[1])
    : [];

  const cspMatch = content.match(/ContentSecurityPolicy\s*=\s*\[([\s\S]*?)\]\.join/);
  const cspLines = cspMatch ? cspMatch[1].split('\n') : [];
  const cspDomains: string[] = [];

  for (const raw of cspLines) {
    const line = raw.replace(/^[\s"]+|[\s",]+$/g, '');
    if (!line) continue;
    const tokens = line.split(/\s+/);
    for (const token of tokens) {
      if (token.startsWith('https://') || token.startsWith('http://')) {
        const host = token.replace(/^https?:\/\/(\*\.)?/, '$1').replace(/\/.*$/, '');
        cspDomains.push(host);
      }
    }
  }

  return { imageDomains, cspDomains };
}

function collectRefs(): Ref[] {
  const root = path.join(__dirname, '..');
  const patterns = ['{app,apps,components,pages}/**/*.{js,jsx,ts,tsx}'];
  const files = fg.sync(patterns, {
    cwd: root,
    ignore: ['**/__tests__/**', '**/*.test.*', '**/*.spec.*'],
  });
  const refs: Ref[] = [];

  for (const file of files) {
    const abs = path.join(root, file);
    const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
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
          refs.push({ file, line: i + 1, domain });
        } catch {
          /* ignore invalid URLs */
        }
      }
    }
  }
  return refs;
}

function isAllowed(domain: string, allowlist: string[]): boolean {
  return allowlist.some((allowed) => {
    if (allowed.startsWith('*.')) {
      const base = allowed.slice(2);
      return domain === base || domain.endsWith(`.${base}`);
    }
    return domain === allowed;
  });
}

test('external embed domains are allowlisted', () => {
  const { imageDomains, cspDomains } = parseConfig();
  const allowlist = [...new Set([...imageDomains, ...cspDomains])];
  const refs = collectRefs();
  const errors: string[] = [];

  for (const ref of refs) {
    if (!isAllowed(ref.domain, allowlist)) {
      errors.push(`${ref.domain} in ${ref.file}:${ref.line}`);
    }
  }

  if (errors.length) {
    throw new Error('Missing allowlist entries for:\n' + errors.join('\n'));
  }
});
