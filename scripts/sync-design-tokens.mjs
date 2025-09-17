#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const CSS_PATH = path.join(ROOT_DIR, 'styles', 'tokens.css');
const MANIFEST_PATH = path.join(ROOT_DIR, 'styles', 'tokens.json');

if (!fs.existsSync(CSS_PATH)) {
  console.error('Cannot find styles/tokens.css');
  process.exit(1);
}

const css = fs.readFileSync(CSS_PATH, 'utf8');
const tokens = extractDesignTokens(css);

let existingVersion = '1.0.0';
if (fs.existsSync(MANIFEST_PATH)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    if (typeof parsed.version === 'string') {
      existingVersion = parsed.version;
    }
  } catch (error) {
    console.warn('Unable to parse existing styles/tokens.json, defaulting version to 1.0.0');
  }
}

const nextVersion = process.env.TOKEN_VERSION_BUMP || existingVersion;
const manifest = {
  version: nextVersion,
  source: 'styles/tokens.css',
  colors: tokens.colors,
  spacing: tokens.spacing,
  radius: tokens.radius,
};

const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
fs.writeFileSync(MANIFEST_PATH, manifestJson, 'utf8');

if (process.env.TOKEN_VERSION_BUMP && process.env.TOKEN_VERSION_BUMP !== existingVersion) {
  console.log(`Design token manifest written with version ${process.env.TOKEN_VERSION_BUMP}`);
} else {
  console.log(`Design token manifest synchronized (version ${nextVersion}).`);
}

function extractDesignTokens(cssContent) {
  const block = readRootBlock(cssContent);
  const colors = {};
  const spacing = {};
  const radius = {};

  const varRegex = /--([^:]+):\s*([^;]+);/g;
  let match;
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

function readRootBlock(cssContent) {
  const rootIndex = cssContent.indexOf(':root');
  if (rootIndex === -1) {
    throw new Error('styles/tokens.css is missing a :root block');
  }

  const braceStart = cssContent.indexOf('{', rootIndex);
  if (braceStart === -1) {
    throw new Error('Unable to locate opening brace for :root block');
  }

  let depth = 0;
  for (let i = braceStart; i < cssContent.length; i += 1) {
    const char = cssContent[i];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return cssContent.slice(braceStart + 1, i);
      }
    }
  }

  throw new Error('Unable to locate closing brace for :root block in styles/tokens.css');
}
