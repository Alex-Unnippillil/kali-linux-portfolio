import fs from 'fs';
import pa11y from 'pa11y';
import logger from '../utils/logger';

const configPath = new URL('../pa11yci.json', import.meta.url);
const { defaults = {}, urls = [], scenarios = [{}] } = JSON.parse(
  fs.readFileSync(configPath),
);

(async () => {
  let hasErrors = false;
  for (const url of urls) {
    for (const scenario of scenarios) {
      const options = { ...defaults, ...scenario };
      const label = scenario.label ? ` (${scenario.label})` : '';
      logger.info(`Testing ${url}${label}`);
      const results = await pa11y(url, options);
      if (results.issues.length > 0) {
        hasErrors = true;
        for (const issue of results.issues) {
          logger.warn(`  [${issue.code}] ${issue.message} (${issue.selector})`);
        }
      } else {
        logger.info('  No issues found');
      }
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
})();

