import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import pa11y from 'pa11y';
import puppeteer from 'puppeteer';

const configUrl = new URL('../pa11yci.json', import.meta.url);
const configPath = fileURLToPath(configUrl);
const configDir = path.dirname(configPath);
const { defaults = {}, urls = [], scenarios = [{}] } = JSON.parse(
  fs.readFileSync(configPath, 'utf8'),
);

const resolveScript = async scriptPath => {
  const absolutePath = path.isAbsolute(scriptPath)
    ? scriptPath
    : path.join(configDir, scriptPath);
  const scriptModule = await import(pathToFileURL(absolutePath));
  return scriptModule.default || scriptModule;
};

(async () => {
  let hasErrors = false;
  for (const url of urls) {
    for (const scenario of scenarios) {
      const { label, beforeScript, settings, ...scenarioOptions } = scenario;
      const options = { ...defaults, ...scenarioOptions };
      const labelSuffix = label ? ` (${label})` : '';
      const launchConfig = options.chromeLaunchConfig ?? {};
      console.log(`Testing ${url}${labelSuffix}`);
      let browser;
      let page;
      try {
        browser = await puppeteer.launch(launchConfig);
        page = await browser.newPage();

        if (beforeScript) {
          const applyScenario = await resolveScript(beforeScript);
          await applyScenario(page, { url, options, scenario, settings });
        }

        options.browser = browser;
        options.page = page;

        const results = await pa11y(url, options);
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
        console.error(`  Failed to execute Pa11y: ${error.message}`);
      } finally {
        if (page) {
          try {
            await page.close();
          } catch (closeError) {
            console.warn('  Unable to close page cleanly', closeError.message);
          }
        }
        if (browser) {
          try {
            await browser.close();
          } catch (closeError) {
            console.warn('  Unable to close browser cleanly', closeError.message);
          }
        }
      }
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
})();

