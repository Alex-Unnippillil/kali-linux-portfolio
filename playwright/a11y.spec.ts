import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Maximum allowed accessibility violations by impact level
const thresholds: Record<string, number> = {
  critical: 0,
  serious: 0,
  // Allow a limited number of moderate/minor issues until they are fixed
  moderate: 10,
  minor: 50,
};

const topLevelPages = [
  '/',
  '/apps',
  '/admin/messages',
  '/daily-quote',
  '/dummy-form',
  '/gamepad-calibration',
  '/hook-flow',
  '/hydra-preview',
  '/input-hub',
  '/keyboard-reference',
  '/module-workspace',
  '/nessus-dashboard',
  '/nessus-report',
  '/network-topology',
  '/nikto-report',
  '/notes',
  '/popular-modules',
  '/post_exploitation',
  '/profile',
  '/qr',
  '/qr/vcard',
  '/recon/graph',
  '/security-education',
  '/sekurlsa_logonpasswords',
  '/share-target',
  '/spoofing',
  '/video-gallery',
  '/wps-attack',
];

const representativeWindows = [
  '/apps/2048',
  '/apps/blackjack',
  '/apps/beef',
  '/apps/converter',
  '/apps/firefox',
  '/apps/input-lab',
  '/apps/john',
  '/apps/kismet',
  '/apps/metasploit',
  '/apps/metasploit-post',
  '/apps/nmap-nse',
  '/apps/project-gallery',
  '/apps/qr',
  '/apps/solitaire',
  '/apps/spotify',
  '/apps/ssh',
  '/apps/subnet-calculator',
  '/apps/tower-defense',
  '/apps/volatility',
  '/apps/vscode',
  '/apps/weather_widget',
  '/apps/wireshark',
  '/apps/word_search',
  '/apps/x',
];

for (const path of [...topLevelPages, ...representativeWindows]) {
  test(`accessibility audit for ${path}`, async ({ page }) => {
    await page.goto(`http://localhost:3000${path}`);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const counts = results.violations.reduce<Record<string, number>>(
      (acc, v) => {
        const impact = v.impact || 'minor';
        acc[impact] = (acc[impact] || 0) + 1;
        return acc;
      },
      {},
    );

    for (const [impact, max] of Object.entries(thresholds)) {
      const count = counts[impact] || 0;
      expect(
        count,
        `${path} has ${count} ${impact} violations (threshold ${max})`,
      ).toBeLessThanOrEqual(max);
    }
  });
}
