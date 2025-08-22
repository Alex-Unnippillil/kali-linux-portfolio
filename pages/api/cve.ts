export const config = {
  runtime: 'edge',
};

interface ExploitInfo {
  id: string;
  file: string;
  description: string;
  source_url: string;
}

const responseCache = new Map<string, { data: unknown; expiry: number }>();
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

export default async function handler(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword') || '';
  const recent = parseInt(searchParams.get('recent') || '30', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  const cacheKey = `${keyword}|${recent}|${page}|${pageSize}`;
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return new Response(JSON.stringify(cached.data), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
    });
  }

  const startIndex = (page - 1) * pageSize;
  const pubStartDate = new Date(Date.now() - recent * 86400000).toISOString();
  const nvdUrl = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(keyword)}&resultsPerPage=${pageSize}&startIndex=${startIndex}&pubStartDate=${encodeURIComponent(pubStartDate)}`;

  const nvdRes = await fetch(nvdUrl);
  const nvdData = await nvdRes.json();

  const exploits = await loadExploitMap();
  const vulnerabilities = (nvdData.vulnerabilities || []).map((v: any) => {
    const id = v.cve?.id;
    return {
      ...v,
      exploits: exploits.get(id) || [],
    };
  });

  const data = { totalResults: nvdData.totalResults, vulnerabilities };
  responseCache.set(cacheKey, { data, expiry: Date.now() + 3600 * 1000 });

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
  });
}

