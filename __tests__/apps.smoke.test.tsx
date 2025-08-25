import React from 'react';
import fs from 'fs';
import path from 'path';
import { render } from '@testing-library/react';

// Some apps import this package which isn't installed in the test env
jest.mock('styled-jsx/style', () => () => null, { virtual: true });

// Mock browser APIs that may be missing in the Jest environment
beforeAll(() => {
  // Some apps rely on canvas APIs which aren't implemented in jsdom
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: [] })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => []),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  }));

  // mock fetch for components that request external resources
  (global as any).fetch = jest.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({}) })
  );

  // basic Worker mock for components using web workers
  class WorkerMock {
    onmessage: ((e: any) => void) | null = null;
    postMessage() {}
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
  }
  (global as any).Worker = WorkerMock;

  // matchMedia mock
  window.matchMedia =
    window.matchMedia ||
    ((query: string) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));
});

describe('App component smoke tests', () => {
  const appsDir = path.join(process.cwd(), 'components', 'apps');
  const entries = fs.readdirSync(appsDir);

  const skip = new Set([
    'quadtree.js',
    'sokoban.js',
    'space-invaders.js',
    'pong.js',
    'snake.js',
  ]);

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
    return /\.(tsx|ts|jsx)$/.test(entry) ? [fullPath] : [];
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
