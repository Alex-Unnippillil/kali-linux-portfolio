#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('styles/tokens.css');
const css = fs.readFileSync(file, 'utf8');

const highContrastBlock = css.match(/\.high-contrast\s*\{([^}]*)\}/);
if (!highContrastBlock) {
  console.error('Could not locate .high-contrast block in styles/tokens.css');
  process.exit(1);
}

const vars = Object.fromEntries(
  [...highContrastBlock[1].matchAll(/--([a-z0-9-]+):\s*([^;]+);/gi)].map(([, name, value]) => [
    name.trim(),
    value.trim(),
  ]),
);

const required = [
  'icon-container',
  'icon-outline',
  'icon-symbol',
  'icon-symbol-strong',
  'icon-fill',
];

for (const key of required) {
  if (!(key in vars)) {
    console.error(`Missing --${key} definition in high contrast tokens`);
    process.exit(1);
  }
}

const hexToRgb = hex => {
  const value = hex.replace('#', '').trim();
  if (!/^([0-9a-f]{6})$/i.test(value)) {
    throw new Error(`Unsupported color format: ${hex}`);
  }
  const bigint = parseInt(value, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const relativeLuminance = ({ r, g, b }) => {
  const transform = channel => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const R = transform(r);
  const G = transform(g);
  const B = transform(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

const contrastRatio = (fg, bg) => {
  const L1 = relativeLuminance(hexToRgb(fg));
  const L2 = relativeLuminance(hexToRgb(bg));
  const [light, dark] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (light + 0.05) / (dark + 0.05);
};

const pairs = [
  ['outline vs container', vars['icon-outline'], vars['icon-container']],
  ['symbol vs container', vars['icon-symbol'], vars['icon-container']],
  ['symbol-strong vs fill', vars['icon-symbol-strong'], vars['icon-fill']],
];

let failures = 0;
for (const [label, fg, bg] of pairs) {
  const ratio = contrastRatio(fg, bg);
  if (ratio < 7) {
    console.error(`${label} contrast ratio ${ratio.toFixed(2)} is below 7:1`);
    failures += 1;
  } else {
    console.log(`${label}: ${ratio.toFixed(2)}:1`);
  }
}

if (failures > 0) {
  process.exit(1);
}
