import fs from 'fs';
import pa11y from 'pa11y';

const configPath = new URL('../pa11yci.json', import.meta.url);
const { defaults = {}, urls = [], scenarios = [{}] } = JSON.parse(
  fs.readFileSync(configPath),
);

const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';

(async () => {
  let hasErrors = false;
  for (const url of urls) {
    const targetUrl = url.startsWith('http') ? url : new URL(url, baseUrl).toString();
    for (const scenario of scenarios) {
      const options = { ...defaults, ...scenario };
      const label = scenario.label ? ` (${scenario.label})` : '';
      console.log(`Testing ${targetUrl}${label}`);
      const results = await pa11y(targetUrl, options);
      if (results.issues.length > 0) {
        hasErrors = true;
        for (const issue of results.issues) {
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

