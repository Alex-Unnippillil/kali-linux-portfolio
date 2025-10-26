import fs from 'fs';
import path from 'path';
import pa11y from 'pa11y';

const configPath = new URL('../pa11yci.json', import.meta.url);
const { defaults = {}, urls = [], scenarios = [{}] } = JSON.parse(
  fs.readFileSync(configPath),
);

const args = process.argv.slice(2);
let saveBaselinePath;
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg.startsWith('--save-baseline=')) {
    const [, value] = arg.split('=');
    saveBaselinePath = value;
  } else if (arg === '--save-baseline') {
    saveBaselinePath = args[i + 1];
    i += 1;
  }
}

if (saveBaselinePath) {
  if (!saveBaselinePath.trim()) {
    console.warn('Ignoring empty value for --save-baseline');
    saveBaselinePath = undefined;
  } else if (!path.isAbsolute(saveBaselinePath)) {
    saveBaselinePath = path.join(process.cwd(), saveBaselinePath);
  }
}

(async () => {
  let hasErrors = false;
  const summary = [];
  const scenarioList = Array.isArray(scenarios) && scenarios.length ? scenarios : [{}];

  for (const entry of urls) {
    const entryConfig =
      typeof entry === 'string' ? { url: entry } : { ...entry };
    const { url, label: entryLabel, ...entryOptions } = entryConfig;

    if (!url) {
      console.warn('Skipping pa11y entry without a url definition', entry);
      continue;
    }

    for (const scenario of scenarioList) {
      const scenarioConfig = scenario ?? {};
      const { label: scenarioLabel, ...scenarioOptions } = scenarioConfig;
      const options = { ...defaults, ...entryOptions, ...scenarioOptions };

      const labels = [];
      if (entryLabel) {
        labels.push(`[${entryLabel}]`);
      }
      if (scenarioLabel) {
        labels.push(`(${scenarioLabel})`);
      }

      const labelText = labels.length ? ` ${labels.join(' ')}` : '';
      console.log(`Testing ${url}${labelText}`);

      try {
        const results = await pa11y(url, options);
        const issues = Array.isArray(results.issues) ? results.issues : [];

        summary.push({
          url,
          label: entryLabel ?? null,
          scenario: scenarioLabel ?? null,
          issues: issues.map((issue) => ({
            code: issue.code,
            type: issue.type,
            typeCode: issue.typeCode,
            message: issue.message,
            selector: issue.selector,
            context: issue.context,
          })),
        });

        if (issues.length > 0) {
          hasErrors = true;
          for (const issue of issues) {
            console.log(`  [${issue.code}] ${issue.message} (${issue.selector})`);
          }
        } else {
          console.log('  No issues found');
        }
      } catch (error) {
        hasErrors = true;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  Error running pa11y: ${message}`);
        summary.push({
          url,
          label: entryLabel ?? null,
          scenario: scenarioLabel ?? null,
          error: message,
          issues: [],
        });
      }
    }
  }

  if (saveBaselinePath) {
    fs.mkdirSync(path.dirname(saveBaselinePath), { recursive: true });
    fs.writeFileSync(saveBaselinePath, JSON.stringify(summary, null, 2));
    console.log(`Baseline written to ${saveBaselinePath}`);
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
})();

