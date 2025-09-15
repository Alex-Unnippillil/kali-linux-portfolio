import fs from 'fs';
import tinycolor from 'tinycolor2';

const css = fs.readFileSync('styles/globals.css', 'utf8');

function extractVars(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}\\s*{([\\s\\S]*?)}`, 'm');
  const match = css.match(regex);
  if (!match) {
    throw new Error(`Selector ${selector} not found in styles/globals.css`);
  }
  const block = match[1];
  const vars = {};
  const varRegex = /--(color-[^:]+):\s*([^;]+)/g;
  let m;
  while ((m = varRegex.exec(block)) !== null) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

function checkContrast(bg, fg, label) {
  const ratio = tinycolor.readability(bg, fg);
  if (ratio < 4.5) {
    console.error(`${label} contrast ratio ${ratio.toFixed(2)} < 4.5`);
    process.exitCode = 1;
  } else {
    console.log(`${label} contrast ratio ${ratio.toFixed(2)}`);
  }
}

const dark = extractVars(':root');
const light = extractVars("html[data-theme='light']");

checkContrast(dark['color-bg'], dark['color-text'], 'dark bg/text');
checkContrast(dark['color-bg'], dark['color-primary'], 'dark bg/primary');
checkContrast(light['color-bg'], light['color-text'], 'light bg/text');
checkContrast(light['color-bg'], light['color-primary'], 'light bg/primary');

if (process.exitCode) {
  process.exit(1);
}
