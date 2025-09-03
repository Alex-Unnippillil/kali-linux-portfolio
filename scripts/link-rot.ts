import fg from 'fast-glob';
import { readFile, writeFile } from 'fs/promises';

type DeadLink = {
  url: string;
  files: string[];
  status: number | null;
  archive: string;
};

async function getArchive(url: string): Promise<string> {
  try {
    const res = await fetch(
      `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`
    );
    const data = await res.json();
    return (
      data?.archived_snapshots?.closest?.url ??
      `https://web.archive.org/web/*/${encodeURIComponent(url)}`
    );
  } catch {
    return `https://web.archive.org/web/*/${encodeURIComponent(url)}`;
  }
}

async function check(url: string): Promise<{
  ok: boolean;
  status: number | null;
  archive: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      return { ok: true, status: res.status, archive: '' };
    }
    return {
      ok: false,
      status: res.status,
      archive: await getArchive(url)
    };
  } catch {
    clearTimeout(timeout);
    return {
      ok: false,
      status: null,
      archive: await getArchive(url)
    };
  }
}

async function main() {
  const files = await fg(['**/*.{md,mdx,html,ts,tsx,js,jsx}'], {
    ignore: ['node_modules/**', '.next/**', 'dist/**', 'public/**', 'link-rot-report.md']
  });
  const urlRegex = /https?:\/\/[^\s)"'<>]+/g;

  const map = new Map<string, Set<string>>();

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    const matches = content.match(urlRegex);
    if (matches) {
      for (const url of matches) {
        if (!map.has(url)) map.set(url, new Set());
        map.get(url)!.add(file);
      }
    }
  }

  const report: DeadLink[] = [];

  for (const [url, fileSet] of map) {
    const { ok, status, archive } = await check(url);
    if (!ok) {
      report.push({ url, files: [...fileSet], status, archive });
    }
  }

  if (report.length === 0) {
    console.log('No dead links found.');
    return;
  }

  let output = '# Link Rot Report\n\n';
  for (const item of report) {
    const status = item.status === null ? 'no response' : `status ${item.status}`;
    output += `- ${item.url} (${status})\n  - Files: ${item.files.join(', ')}\n  - Archive: ${item.archive}\n`;
  }

  await writeFile('link-rot-report.md', output, 'utf8');
  console.log(output);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
