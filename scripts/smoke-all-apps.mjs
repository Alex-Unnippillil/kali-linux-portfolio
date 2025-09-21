import { chromium, firefox, webkit } from 'playwright';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

(async () => {
  const browsers = [
    { name: 'chromium', type: chromium },
    { name: 'firefox', type: firefox },
    { name: 'webkit', type: webkit },
  ];

  // Add new app routes here to include them in smoke tests
  const routes = [
    '/apps/2048',
    '/apps/ascii-art',
    '/apps/autopsy',
    '/apps/beef',
    '/apps/blackjack',
    '/apps/calculator',
    '/apps/checkers',
    '/apps/connect-four',
    '/apps/contact',
    '/apps/converter',
    '/apps/figlet',
    '/apps/http',
    '/apps',
    '/apps/input-lab',
    '/apps/john',
    '/apps/kismet',
    '/apps/metasploit-post',
    '/apps/metasploit',
    '/apps/minesweeper',
    '/apps/nmap-nse',
    '/apps/password_generator',
    '/apps/phaser_matter',
    '/apps/pinball',
    '/apps/project-gallery',
    '/apps/qr',
    '/apps/settings',
    '/apps/simon',
    '/apps/sokoban',
    '/apps/solitaire',
    '/apps/spotify',
    '/apps/ssh',
    '/apps/sticky_notes',
    '/apps/timer_stopwatch',
    '/apps/tower-defense',
    '/apps/volatility',
    '/apps/vscode',
    '/apps/weather',
    '/apps/weather_widget',
    '/apps/wireshark',
    '/apps/word_search',
  ];

  let hadError = false;
  const results = [];

  for (const { name, type } of browsers) {
    const browser = await type.launch();
    const context = await browser.newContext();

    for (const route of routes) {
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      page.on('pageerror', (err) => {
        pageErrors.push(err.message);
      });
      console.log(`[${name}] Visiting ${route}`);
      let error = '';
      try {
        const response = await page.goto(`${BASE_URL}${route}`);
        if (!response || !response.ok()) {
          error = `HTTP ${response ? response.status() : 'no response'}`;
        } else if (consoleErrors.length > 0 || pageErrors.length > 0) {
          error = [...pageErrors, ...consoleErrors].join('\n');
        }
      } catch (err) {
        error = err.message;
      }
      if (error) {
        hadError = true;
        console.error(`[${name}] Error on ${route}: ${error}`);
      }
      results.push({ browser: name, route, error });
      await page.close();
    }

    await browser.close();
  }

  if (hadError) {
    console.error('Completed with errors');
  } else {
    console.log('All app routes loaded without console errors.');
  }

  // Write results to log file if TEST_LOG env variable provided
  if (process.env.SMOKE_LOG) {
    fs.writeFileSync(process.env.SMOKE_LOG, JSON.stringify(results, null, 2));
  }
})();
