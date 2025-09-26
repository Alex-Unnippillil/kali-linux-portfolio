#!/usr/bin/env node
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { optimize } from 'svgo';

const ICON_GLOB = 'public/icons/**/*.svg';

const cwd = process.cwd();

const files = await fg(ICON_GLOB, {
  cwd,
  absolute: true,
  onlyFiles: true,
  followSymbolicLinks: false,
});

if (files.length === 0) {
  console.log('optimize-icons: no SVG icons found');
  process.exit(0);
}

let optimizedCount = 0;

for (const file of files) {
  const original = await readFile(file, 'utf8');
  const result = optimize(original, {
    path: file,
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            removeViewBox: false,
          },
        },
      },
      'convertStyleToAttrs',
      'reusePaths',
    ],
  });

  if ('error' in result) {
    throw new Error(`SVGO failed for ${path.relative(cwd, file)}: ${result.error}`);
  }

  const optimizedSvg = result.data.trim();

  if (optimizedSvg !== original.trim()) {
    await writeFile(file, `${optimizedSvg}\n`, 'utf8');
    optimizedCount += 1;
  }

  const { size } = await stat(file);
  if (size >= 4096) {
    throw new Error(`Icon ${path.relative(cwd, file)} exceeds 4 KB after optimization (${size} bytes)`);
  }
}

console.log(
  `optimize-icons: processed ${files.length} file(s), updated ${optimizedCount}, all under 4 KB`
);
