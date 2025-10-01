import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pa11y from 'pa11y';

const configUrl = new URL('../pa11yci.json', import.meta.url);
const configPath = fileURLToPath(configUrl);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const {
  defaults = {},
  urls = [],
  routes = [],
  scenarios = [{}],
} = config;

const { baseUrl: defaultsBaseUrl, ...pa11yDefaults } = defaults;

const baseUrlFromDefaults = typeof defaultsBaseUrl === 'string' ? defaultsBaseUrl : undefined;
const baseUrl = process.env.BASE_URL ?? baseUrlFromDefaults ?? 'http://localhost:3000';

const resolveTargetUrl = (target) => {
  if (!target) return undefined;
  try {
    return new URL(target, baseUrl).toString();
  } catch (error) {
    console.warn(`Unable to resolve URL for target "${target}":`, error);
    return undefined;
  }
};

const expandedTargets = [
  ...urls.map((target) => resolveTargetUrl(target)),
  ...routes.map((route) => resolveTargetUrl(route)),
].filter(Boolean);

if (expandedTargets.length === 0) {
  console.error('No Pa11y targets configured. Check pa11yci.json.');
  process.exitCode = 1;
  process.exit();
}

(async () => {
  let hasErrors = false;
  for (const target of expandedTargets) {
    for (const scenario of scenarios) {
      const options = { ...pa11yDefaults, ...scenario };
      const scenarioLabel = scenario.label ? ` (${scenario.label})` : '';
      console.log(`Testing ${target}${scenarioLabel}`);

      if (options.beforeScript && !path.isAbsolute(options.beforeScript)) {
        options.beforeScript = path.resolve(
          path.dirname(configPath),
          options.beforeScript,
        );
      }

      try {
        const results = await pa11y(target, options);
        if (results.issues.length > 0) {
          hasErrors = true;
          for (const issue of results.issues) {
            console.log(`  [${issue.code}] ${issue.message} (${issue.selector})`);
          }
        } else {
          console.log('  No issues found');
        }
      } catch (error) {
        hasErrors = true;
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`  Error running Pa11y: ${err.message}`);
      }
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
})();

