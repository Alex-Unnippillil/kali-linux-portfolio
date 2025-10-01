import fs from 'fs';
import path from 'path';

const readTokens = () =>
  fs.readFileSync(path.join(process.cwd(), 'styles', 'tokens.css'), 'utf8');

const extractBlock = (css: string, selector: string) => {
  const pattern = new RegExp(`${selector}\\s*{([^}]*)}`, 'm');
  const match = css.match(pattern);
  if (!match) {
    throw new Error(`Could not find block for ${selector}`);
  }
  return match[1].trim();
};

const extractMediaRoot = (css: string) => {
  const pattern = /@media\s*\(prefers-contrast:\s*more\)\s*{[\s\S]*?:root\s*{([\s\S]*?)}\s*}/m;
  const match = css.match(pattern);
  if (!match) {
    throw new Error('Could not find prefers-contrast media block');
  }
  return match[1].trim();
};

describe('high contrast tokens', () => {
  const css = readTokens();
  const classBlock = extractBlock(css, '\\.high-contrast');
  const mediaBlock = extractMediaRoot(css);

  test('class block matches snapshot', () => {
    expect(classBlock).toMatchSnapshot();
  });

  test('media query block matches snapshot', () => {
    expect(mediaBlock).toMatchSnapshot();
  });

  test('media query tokens mirror class tokens', () => {
    const normalize = (block: string) =>
      block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .sort();
    expect(normalize(mediaBlock)).toEqual(normalize(classBlock));
  });
});
