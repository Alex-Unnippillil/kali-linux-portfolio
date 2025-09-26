import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function getEnvExamplePath(): string {
  const candidates = ['.env.example', '.env.local.example'];
  for (const candidate of candidates) {
    if (existsSync(resolve(process.cwd(), candidate))) {
      return candidate;
    }
  }

  throw new Error('Could not find .env.example or .env.local.example in project root.');
}

function parseEnvKeys(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf8');
  const keys = new Set<string>();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const match = line.match(/^([A-Z0-9_]+)\s*=\s*/i);
    if (match) {
      keys.add(match[1]);
    }
  }

  return Array.from(keys);
}

async function getVercelEnvKeys(): Promise<Set<string>> {
  const token = process.env.VERCEL_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID ?? process.env.VERCEL_PROJECT_NAME;
  const scope = process.env.VERCEL_TEAM_SLUG ?? process.env.VERCEL_ORG_SLUG;

  const args = ['--yes', 'vercel', 'env', 'ls', '--json'];

  if (token) {
    args.push(`--token=${token}`);
  }

  if (project) {
    args.push(`--project=${project}`);
  }

  if (scope) {
    args.push(`--scope=${scope}`);
  }

  return new Promise((resolvePromise, rejectPromise) => {
    execFile('npx', args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const message = stderr?.trim() || error.message;
        rejectPromise(new Error(`Failed to execute Vercel CLI: ${message}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as Array<{ key?: string }> | { envs?: Array<{ key?: string }> };
        const list = Array.isArray(parsed) ? parsed : parsed?.envs ?? [];
        const keys = new Set<string>();
        for (const entry of list) {
          if (entry?.key) {
            keys.add(entry.key);
          }
        }
        resolvePromise(keys);
      } catch (parseError) {
        rejectPromise(new Error(`Unable to parse Vercel CLI output as JSON. Raw output: ${stdout}`));
      }
    });
  });
}

async function main() {
  try {
    const envFile = getEnvExamplePath();
    const localKeys = parseEnvKeys(envFile);
    if (localKeys.length === 0) {
      console.warn(`No environment keys found in ${envFile}.`);
      return;
    }

    const vercelKeys = await getVercelEnvKeys();
    const missing = localKeys.filter((key) => !vercelKeys.has(key));

    if (missing.length > 0) {
      console.error('Missing environment variables in Vercel project:');
      for (const key of missing) {
        console.error(` - ${key}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log('All environment keys from example file are present in Vercel.');
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}

main();
