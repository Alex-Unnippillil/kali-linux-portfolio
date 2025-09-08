import fs from 'fs';
import pa11y from 'pa11y';
import loggerModule from '../utils/logger.ts';
const logger = loggerModule.default;


const configPath = new URL('../pa11yci.json', import.meta.url);
const { defaults = {}, urls = [], scenarios = [{}] } = JSON.parse(
  fs.readFileSync(configPath),
);

(async () => {
  const totals = { error: 0, warning: 0, notice: 0 };
  for (const url of urls) {
    for (const scenario of scenarios) {
      const options = { ...defaults, ...scenario };
      const label = scenario.label ? ` (${scenario.label})` : '';
      logger.info(`Testing ${url}${label}`);
      const results = await pa11y(url, options);
      if (results.issues.length > 0) {
        for (const issue of results.issues) {
          totals[issue.type]++;
          logger.warn(`  [${issue.code}] ${issue.message} (${issue.selector})`);
        }
      } else {
        logger.info('  No issues found');
      }
    }
  }

  logger.info(`Summary: ${totals.error} errors, ${totals.warning} warnings, ${totals.notice} notices`);
  if (totals.error > 0) {
    process.exitCode = 1;
  }
})();

