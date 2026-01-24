import fs from 'fs';
const configPath = new URL('../pa11yci.json', import.meta.url);
const { defaults = {}, urls = [], scenarios = [{}] } = JSON.parse(
  fs.readFileSync(configPath),
);

async function loadPa11y() {
  const mod = await import('pa11y').catch((error) => {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' || error?.code === 'MODULE_NOT_FOUND') {
      console.error(
        'pa11y is optional and not installed. Install it with "PUPPETEER_SKIP_DOWNLOAD=true yarn add -D pa11y" to run accessibility checks.',
      );
      console.error('Skipping a11y run.');
      process.exit(1);
    }
    throw error;
  });
  return mod.default || mod;
}

(async () => {
  if (!process.env.PUPPETEER_SKIP_DOWNLOAD) {
    console.warn(
      'Set PUPPETEER_SKIP_DOWNLOAD=true when installing pa11y in CI to avoid downloading Chromium.',
    );
  }

  const pa11y = await loadPa11y();
  let hasErrors = false;
  for (const url of urls) {
    for (const scenario of scenarios) {
      const options = { ...defaults, ...scenario };
      const label = scenario.label ? ` (${scenario.label})` : '';
      console.log(`Testing ${url}${label}`);
      const results = await pa11y(url, options);
      const ignore = new Set(options.ignore ?? []);
      const issues = results.issues.filter((issue) => !ignore.has(issue.code));
      if (issues.length > 0) {
        hasErrors = true;
        for (const issue of issues) {
          console.log(`  [${issue.code}] ${issue.message} (${issue.selector})`);
        }
      } else {
        console.log('  No issues found');
      }
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
})();
