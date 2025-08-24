import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'apps.config.js');
const content = fs.readFileSync(configPath, 'utf8');
const appsSection = content.match(/const apps = \[([\s\S]*?)\];/);
const appsArray = appsSection ? appsSection[1] : '';
const slugs = Array.from(appsArray.matchAll(/id:\s*'([^']+)'/g)).map((m) => m[1]);

test.describe('apps pages', () => {
  for (const slug of slugs) {
    test(`loads /apps/${slug} without errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: Error[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      page.on('pageerror', (err) => {
        pageErrors.push(err);
      });

      const response = await page.goto(`/apps/${slug}`);
      expect(response?.status()).toBe(200);
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }
});
