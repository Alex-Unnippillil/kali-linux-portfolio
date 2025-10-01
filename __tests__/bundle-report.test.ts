/** @jest-environment node */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';

describe('bundle-report utilities', () => {
  let bundleReport: typeof import('../scripts/bundle-report.mjs');

  beforeAll(async () => {
    // @ts-expect-error -- importing ESM module from CommonJS context
    bundleReport = await import('../scripts/bundle-report.mjs');
  });

  describe('computeRouteSizes', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bundle-report-'));
      await fs.mkdir(path.join(tempDir, 'static', 'chunks'), { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('sums unique asset sizes per route', async () => {
      const chunkDir = path.join(tempDir, 'static', 'chunks');
      await fs.writeFile(path.join(chunkDir, 'shared.js'), 'a'.repeat(1024));
      await fs.writeFile(path.join(chunkDir, 'route-a.js'), 'a'.repeat(2048));
      await fs.writeFile(path.join(chunkDir, 'route-b.js'), 'a'.repeat(512));

      const manifest = {
        pages: {
          '/a': ['static/chunks/shared.js', 'static/chunks/route-a.js', 'static/chunks/shared.js'],
          '/b': ['static/chunks/shared.js', 'static/chunks/route-b.js'],
          '/_app': ['static/chunks/ignore.js'],
        },
      };

      const sizes = await bundleReport.computeRouteSizes(manifest, { distDir: tempDir });

      expect(sizes.get('/a')).toEqual({
        size: 1024 + 2048,
        files: [
          { file: 'static/chunks/route-a.js', size: 2048 },
          { file: 'static/chunks/shared.js', size: 1024 },
        ],
      });
      expect(sizes.get('/b')).toEqual({
        size: 1024 + 512,
        files: [
          { file: 'static/chunks/shared.js', size: 1024 },
          { file: 'static/chunks/route-b.js', size: 512 },
        ],
      });
      expect(sizes.has('/_app')).toBe(false);
    });
  });

  describe('diffRoutes & findOffenders', () => {
    it('marks new routes and filters increases above the threshold', () => {
      const current = new Map([
        ['/unchanged', { size: 10, files: [] }],
        ['/new', { size: 40000, files: [{ file: 'chunk.js', size: 40000 }] }],
        ['/small', { size: 5000, files: [{ file: 'chunk.js', size: 5000 }] }],
      ]);
      const baseline = {
        '/unchanged': { size: 10 },
        '/small': { size: 4000 },
      };

      const diffs = bundleReport.diffRoutes(baseline, current);
      const offenders = bundleReport.findOffenders(diffs, 30 * 1024);

      const newRoute = diffs.find((entry) => entry.route === '/new');
      expect(newRoute?.status).toBe('added');
      expect(newRoute?.baseline).toBe(0);
      expect(newRoute?.delta).toBe(40000);

      const smallRoute = diffs.find((entry) => entry.route === '/small');
      expect(smallRoute?.delta).toBe(1000);

      expect(offenders).toHaveLength(1);
      expect(offenders[0]?.route).toBe('/new');
    });
  });

  describe('formatBytes', () => {
    it('formats kilobyte and megabyte values', () => {
      expect(bundleReport.formatBytes(1024)).toBe('1.0 kB');
      expect(bundleReport.formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
      expect(bundleReport.formatBytes(512)).toBe('512 B');
    });
  });
});
