import fs from 'fs';
import pa11y from 'pa11y';

const configPath = new URL('../pa11yci.json', import.meta.url);
const { defaults = {}, urls = [] } = JSON.parse(fs.readFileSync(configPath));

(async () => {
  let hasErrors = false;
  for (const url of urls) {
    console.log(`Testing ${url}`);
    const results = await pa11y(url, defaults);
    if (results.issues.length > 0) {
      hasErrors = true;
      for (const issue of results.issues) {
        console.log(`  [${issue.code}] ${issue.message} (${issue.selector})`);
      }
    } else {
      console.log('  No issues found');
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
})();

