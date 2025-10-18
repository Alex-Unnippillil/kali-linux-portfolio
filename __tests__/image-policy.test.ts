import fs from 'fs';
import path from 'path';

const COMPONENTS_DIR = path.join(process.cwd(), 'components');

const componentExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);

function collectFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(entryPath));
    } else if (componentExtensions.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

describe('component image policy', () => {
  it('does not allow raw <img> tags in components', () => {
    const files = collectFiles(COMPONENTS_DIR);
    const offenders = files
      .map((file) => ({ file, content: fs.readFileSync(file, 'utf8') }))
      .filter(({ content }) => /<img\b/i.test(content))
      .map(({ file }) => path.relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});

