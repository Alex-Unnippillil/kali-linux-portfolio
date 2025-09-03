import fs from 'fs';

const { SLACK_WEBHOOK_URL, VERCEL_TOKEN, VERCEL_PROJECT_ID } = process.env;

if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
  console.error('Missing VERCEL_TOKEN or VERCEL_PROJECT_ID');
  process.exit(1);
}

function parseBudgets() {
  const md = fs.readFileSync(new URL('../docs/perf-budget.md', import.meta.url), 'utf8');
  const lines = md.split('\n').filter(l => l.startsWith('|'));
  const data = lines.slice(2); // skip header and separator
  return data.map(line => {
    const [ , route, lcp, fid, cls ] = line.split('|').map(s => s.trim());
    return { route, lcp: Number(lcp), fid: Number(fid), cls: Number(cls) };
  });
}

async function getMetrics(route) {
  const url = `https://api.vercel.com/v1/speed-insights/${VERCEL_PROJECT_ID}?path=${encodeURIComponent(route)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } });
  if (!res.ok) throw new Error(`Failed metrics for ${route}: ${res.status}`);
  return res.json();
}

async function notify(route, metric, value, budget) {
  if (!SLACK_WEBHOOK_URL) return;
  const text = `:rotating_light: ${route} ${metric} ${value} exceeds budget ${budget}`;
  await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
}

(async () => {
  const budgets = parseBudgets();
  for (const { route, lcp, fid, cls } of budgets) {
    const metrics = await getMetrics(route);
    if (metrics.lcp > lcp) await notify(route, 'LCP', metrics.lcp, lcp);
    if (metrics.fid > fid) await notify(route, 'FID', metrics.fid, fid);
    if (metrics.cls > cls) await notify(route, 'CLS', metrics.cls, cls);
  }
})();
