import fs from 'node:fs';
import path from 'node:path';
import tokensManifest from '../../styles/tokens.json';

type TokenRecord = Record<string, string>;

interface TokenManifest {
  version: string;
  source?: string;
  colors: TokenRecord;
  spacing: TokenRecord;
  radius: TokenRecord;
}

const CSS_TOKEN_PATH = path.join(process.cwd(), 'styles', 'tokens.css');
const VERSION_FLAG = process.env.TOKEN_VERSION_BUMP;

/**
 * Workflow for updating tokens:
 * 1. Change values in styles/tokens.css.
 * 2. Regenerate the JSON manifest via `yarn tokens:sync` (writes styles/tokens.json).
 * 3. Bump the `version` field in the manifest to a new semver value and rerun tests with
 *    `TOKEN_VERSION_BUMP=<new version> yarn test`.
 * 4. Commit the CSS and JSON updates together.
 *
 * The VERSION_FLAG guard ensures that accidental edits to the CSS force a conscious version bump
 * before a commit can land.
 */

describe('design tokens manifest', () => {
  it('stays synchronized with styles/tokens.css', () => {
    const css = fs.readFileSync(CSS_TOKEN_PATH, 'utf8');
    const extracted = extractDesignTokens(css);
    const manifest = tokensManifest as TokenManifest;

    const differences: string[] = [
      ...diffCategory('color', extracted.colors, manifest.colors),
      ...diffCategory('spacing', extracted.spacing, manifest.spacing),
      ...diffCategory('radius', extracted.radius, manifest.radius),
    ];

    if (differences.length > 0) {
      const bulletList = differences.map((item) => ` • ${item}`).join('\n');
      const message = VERSION_FLAG
        ? `Design tokens differ from the manifest even though TOKEN_VERSION_BUMP="${VERSION_FLAG}". ` +
          'Run `yarn tokens:sync` to regenerate styles/tokens.json and commit the result.\n' +
          bulletList
        : 'Design tokens differ from the manifest. Bump the manifest version and rerun tests with ' +
          '`TOKEN_VERSION_BUMP=<new version> yarn test` before committing.\n' +
          bulletList;
      throw new Error(message);
    }

    if (VERSION_FLAG) {
      expect(isSemver(VERSION_FLAG)).toBe(true);
      expect(manifest.version).toBe(VERSION_FLAG);
    }

    expect(manifest.colors).toEqual(extracted.colors);
    expect(manifest.spacing).toEqual(extracted.spacing);
    expect(manifest.radius).toEqual(extracted.radius);
  });
});

function extractDesignTokens(css: string) {
  const block = readRootBlock(css);
  const colors: TokenRecord = {};
  const spacing: TokenRecord = {};
  const radius: TokenRecord = {};

  const varRegex = /--([^:]+):\s*([^;]+);/g;
  let match: RegExpExecArray | null;
  while ((match = varRegex.exec(block)) !== null) {
    const [, name, value] = match;
    const trimmedValue = value.trim();
    if (name.startsWith('color-') || name.startsWith('game-color-') || name === 'kali-bg') {
      colors[name] = trimmedValue;
    } else if (name.startsWith('space-')) {
      spacing[name] = trimmedValue;
    } else if (name.startsWith('radius-')) {
      radius[name] = trimmedValue;
    }
  }

  return { colors, spacing, radius };
}

function readRootBlock(css: string) {
  const rootIndex = css.indexOf(':root');
  if (rootIndex === -1) {
    throw new Error('styles/tokens.css is missing a :root block');
  }

  const braceStart = css.indexOf('{', rootIndex);
  if (braceStart === -1) {
    throw new Error('Unable to locate opening brace for :root block');
  }

  let depth = 0;
  for (let i = braceStart; i < css.length; i += 1) {
    const char = css[i];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return css.slice(braceStart + 1, i);
      }
    }
  }

  throw new Error('Unable to locate closing brace for :root block in styles/tokens.css');
}

function diffCategory(
  label: 'color' | 'spacing' | 'radius',
  expected: TokenRecord,
  actual: TokenRecord,
) {
  const issues: string[] = [];
  const expectedKeys = new Set(Object.keys(expected));
  const actualKeys = new Set(Object.keys(actual));

  for (const key of expectedKeys) {
    if (!actualKeys.has(key)) {
      issues.push(`Missing ${label} token "${key}"`);
    } else if (actual[key] !== expected[key]) {
      issues.push(
        `Value mismatch for ${label} token "${key}": expected "${expected[key]}" received "${actual[key]}"`,
      );
    }
  }

  for (const key of actualKeys) {
    if (!expectedKeys.has(key)) {
      issues.push(`Unexpected ${label} token "${key}" present in manifest`);
    }
  }

  return issues;
}

function isSemver(value: string) {
  return /^\d+\.\d+\.\d+$/.test(value);
}
