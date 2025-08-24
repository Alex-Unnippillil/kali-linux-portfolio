import { setupUrlGuard } from "../../lib/urlGuard";
import { loadKevSet } from '../../lib/kev';
import { fetchEpssScores } from '../../lib/epss';
import { rateLimitEdge } from '../../lib/rateLimiter';
import { kv } from '../../lib/kv';

setupUrlGuard();

export const config = {
  runtime: 'edge',
};

interface ExploitInfo {
  id: string;
  file: string;
  description: string;
  source_url: string;
}

let exploitMapPromise: Promise<Map<string, ExploitInfo[]>> | null = null;

async function loadExploitMap(): Promise<Map<string, ExploitInfo[]>> {
  if (exploitMapPromise) return exploitMapPromise;
  exploitMapPromise = fetch('https://gitlab.com/exploit-database/exploitdb/-/raw/main/files_exploits.csv')
    .then((r) => r.text())
    .then((text) => {
      const map = new Map<string, ExploitInfo[]>();
      const lines = text.split('\n').slice(1); // skip header
      for (const line of lines) {
        if (!line.trim()) continue;
        const cols = parseCSV(line);
        const codes = cols[11] || '';
        const cves = codes.split(';').filter((c) => c.startsWith('CVE-'));
        if (cves.length) {
          const exploit: ExploitInfo = {
            id: cols[0],
            file: cols[1],
            description: cols[2],
            source_url: cols[16] || '',
          };
          for (const cve of cves) {
            const arr = map.get(cve) || [];
            arr.push(exploit);
            map.set(cve, arr);
          }
        }
      }
      return map;
    });
  return exploitMapPromise;
}

function parseCSV(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function fetchWithBackoff(
  url: string,
  init: RequestInit,
  retries = 3,
): Promise<Response> {
  let attempt = 0;
  let delay = 1000;
  while (true) {
    const res = await fetch(url, init);
    if (res.ok || attempt >= retries) return res;
    const ra = res.headers.get('Retry-After');
    const wait = ra ? parseInt(ra, 10) * 1000 : delay;
    await new Promise((r) => setTimeout(r, wait));
    attempt++;
    delay *= 2;
  }
}

export default async function handler(req: Request): Promise<Response> {
  const rate = await rateLimitEdge(req);
  if (rate.limited) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...rate.headers },
    });
  }

  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword') || '';
  const domain = searchParams.get('domain') || '';
  let cpe = searchParams.get('cpe') || '';
  const cwe = searchParams.get('cwe') || '';
  const vendor = searchParams.get('vendor') || '';
  const product = searchParams.get('product') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const recent = parseInt(searchParams.get('recent') || '30', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const severity = (searchParams.get('severity') || '')
    .split(',')
    .map((s) => s.toLowerCase())
    .filter(Boolean);
  const sort = searchParams.get('sort') || '';
  const cvssMin = parseFloat(searchParams.get('cvss') || '0');
  const epssMin = parseFloat(searchParams.get('epss') || '0');
  const kevOnly = ['1', 'true'].includes((searchParams.get('kev') || '').toLowerCase());

  if (!cpe && vendor && product) {
    cpe = `cpe:2.3:a:${vendor}:${product}:*:*:*:*:*:*:*:*`;
  }

  const cacheKey = `cve:${keyword}|${domain}|${cpe}|${cwe}|${vendor}|${product}|${startDate}|${endDate}|${recent}|${page}|${pageSize}|${severity.join(',')}|${cvssMin}|${epssMin}|${kevOnly}`;
  const cached = await kv.get<{ data: unknown; expiry: number }>(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return new Response(JSON.stringify(cached.data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200',
        ...rate.headers,
      },
    });
  }

  const startIndex = (page - 1) * pageSize;
  const pubStartDate = startDate
    ? `${startDate}T00:00:00.000`
    : new Date(Date.now() - recent * 86400000).toISOString();
  const keywordParam = [keyword, domain].filter(Boolean).join(' ');
  let nvdUrl = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(keywordParam)}&resultsPerPage=${pageSize}&startIndex=${startIndex}&pubStartDate=${encodeURIComponent(pubStartDate)}`;
  if (endDate) nvdUrl += `&pubEndDate=${encodeURIComponent(`${endDate}T00:00:00.000`)}`;
  if (cpe) nvdUrl += `&cpeName=${encodeURIComponent(cpe)}`;
  if (cwe) nvdUrl += `&cweId=${encodeURIComponent(cwe)}`;

  const headers: Record<string, string> = {};
  if (process.env.NVD_API_KEY) headers['apiKey'] = process.env.NVD_API_KEY;

  const nvdRes = await fetchWithBackoff(nvdUrl, { headers });
  if (!nvdRes.ok) {
    const retryAfter = nvdRes.headers.get('Retry-After') || '30';
    if (cached) {
      return new Response(
        JSON.stringify({ ...(cached.data as any), retryAfter, fromCache: true }),
        {
          status: nvdRes.status,
          headers: { 'Content-Type': 'application/json', 'Retry-After': retryAfter, ...rate.headers },
        },
      );
    }
    return new Response(JSON.stringify({ error: 'nvd_error', retryAfter }), {
      status: nvdRes.status,
      headers: { 'Content-Type': 'application/json', 'Retry-After': retryAfter, ...rate.headers },
    });
  }
  const nvdData = await nvdRes.json();

  const exploits = await loadExploitMap();
  const kevSet = await loadKevSet();
  const ids = (nvdData.vulnerabilities || []).map((v: any) => v.cve?.id).filter(Boolean);
  const epss = await fetchEpssScores(ids);

  let vulnerabilities = (nvdData.vulnerabilities || []).map((v: any) => {
    const id = v.cve?.id;
    const severityVal =
      v.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity ||
      v.cve?.metrics?.cvssMetricV30?.[0]?.cvssData?.baseSeverity ||
      v.cve?.metrics?.cvssMetricV2?.[0]?.baseSeverity;
    return {
      ...v,
      exploits: exploits.get(id) || [],
      kev: kevSet.has(id),
      epss: epss[id]?.epss ?? null,
      epssPercentile: epss[id]?.percentile ?? null,
      severity: severityVal ? String(severityVal).toLowerCase() : undefined,
    };
  });

  if (severity.length) {
    vulnerabilities = vulnerabilities.filter((v: any) =>
      v.severity && severity.includes(v.severity)
    );
  }

  if (cvssMin) {
    vulnerabilities = vulnerabilities.filter((v: any) => {
      const score =
        v.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ||
        v.cve?.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore ||
        v.cve?.metrics?.cvssMetricV2?.[0]?.baseScore || 0;
      return score >= cvssMin;
    });
  }

  if (epssMin) {
    vulnerabilities = vulnerabilities.filter((v: any) => (v.epss || 0) >= epssMin);
  }

  if (kevOnly) {
    vulnerabilities = vulnerabilities.filter((v: any) => v.kev);
  }

  if (sort === 'epss') {
    vulnerabilities.sort((a: any, b: any) => (b.epss || 0) - (a.epss || 0));
  }

  const data = { totalResults: nvdData.totalResults, vulnerabilities };
  await kv.set(cacheKey, { data, expiry: Date.now() + 3600 * 1000 });

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200',
      ...rate.headers,
    },
  });
}

