import React from 'react';
import fs from 'fs';
import path from 'path';
import { render } from '@testing-library/react';

// Some apps import this package which isn't installed in the test env
jest.mock('styled-jsx/style', () => () => null, { virtual: true });
describe('App component smoke tests', () => {
  const appsDir = path.join(process.cwd(), 'components', 'apps');
  const entries = fs.readdirSync(appsDir);

  const skip = new Set(['quadtree.js']);

  const targets = entries.flatMap((entry) => {
    const fullPath = path.join(appsDir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const candidate = [
        'index.tsx',
        'index.ts',
        'index.jsx',
        'index.js',
        `${entry}.tsx`,
        `${entry}.ts`,
        `${entry}.jsx`,
        `${entry}.js`,
      ].find((file) => fs.existsSync(path.join(fullPath, file)));
      return candidate ? [path.join(fullPath, candidate)] : [];
    }

    if (skip.has(entry)) return [];
    return /\.(tsx|ts|jsx|js)$/.test(entry) ? [fullPath] : [];
  });

  targets.forEach((file) => {
    const importPath = path
      .relative(__dirname, file)
      .replace(/\\/g, '/');
    const name = path.relative(appsDir, file);

    it(`renders ${name} without crashing`, async () => {
      const mod = await import(importPath);
      const Component = mod.default || Object.values(mod)[0];

      if (typeof Component !== 'function') {
        // Skip files that don't default export a component
        return;
      }

      render(React.createElement(Component));
    });
  });
});
