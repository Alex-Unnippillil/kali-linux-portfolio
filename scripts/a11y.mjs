import fs from 'fs';
import pa11y from 'pa11y';

const configPath = new URL('../pa11yci.json', import.meta.url);
const { defaults = {}, urls = [], scenarios = [{}] } = JSON.parse(
  fs.readFileSync(configPath),
);

const normalizeUrl = (baseUrl, url) => {
  if (!baseUrl) {
    return url;
  }

  try {
    const parsed = new URL(url);
    return `${baseUrl.replace(/\/$/, '')}${parsed.pathname}${parsed.search ?? ''}`;
  } catch {
    const formatted = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl.replace(/\/$/, '')}${formatted}`;
  }
};

const resolveUrls = () => {
  if (process.env.A11Y_URLS) {
    try {
      const parsed = JSON.parse(process.env.A11Y_URLS);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // fall through to other resolution strategies
    }
  }

  const baseUrl = process.env.BASE_URL;
  if (baseUrl) {
    return urls.map((url) => normalizeUrl(baseUrl, url));
  }

  return urls;
};

(async () => {
  let hasErrors = false;
  const resolvedUrls = resolveUrls();

  for (const url of resolvedUrls) {
    for (const scenario of scenarios) {
      const options = { ...defaults, ...scenario };
      const label = scenario.label ? ` (${scenario.label})` : '';
      console.log(`Testing ${url}${label}`);
      const results = await pa11y(url, options);
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

