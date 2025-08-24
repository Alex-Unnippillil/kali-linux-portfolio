export interface RobotsRuleGroup {
  userAgents: string[];
  allows: string[];
  disallows: string[];
}

export interface RobotsData {
  groups: RobotsRuleGroup[];
  sitemaps: string[];
  unsupported: string[];
  missing: boolean;
}

interface CacheEntry {
  etag?: string;
  data: RobotsData;
}

const cache = new Map<string, CacheEntry>();

function parseRobots(text: string): RobotsData {
  const groups: RobotsRuleGroup[] = [];
  const sitemaps: string[] = [];
  const unsupported: string[] = [];
  let current: RobotsRuleGroup | null = null;

  text.split(/\r?\n/).forEach((line) => {
    const cleaned = line.split('#')[0].trim();
    if (!cleaned) return;
    const [directiveRaw, ...rest] = cleaned.split(':');
    const directive = directiveRaw.trim().toLowerCase();
    const value = rest.join(':').trim();

    if (directive === 'user-agent') {
      const ua = value.toLowerCase();
      if (!current || current.allows.length || current.disallows.length) {
        current = { userAgents: [ua], allows: [], disallows: [] };
        groups.push(current);
      } else {
        current.userAgents.push(ua);
      }
    } else if (directive === 'allow') {
      if (!current) {
        current = { userAgents: ['*'], allows: [], disallows: [] };
        groups.push(current);
      }
      current.allows.push(value);
    } else if (directive === 'disallow') {
      if (!current) {
        current = { userAgents: ['*'], allows: [], disallows: [] };
        groups.push(current);
      }
      current.disallows.push(value || '/');
    } else if (directive === 'sitemap') {
      sitemaps.push(value);
    } else {
      unsupported.push(cleaned);
    }
  });

  return { groups, sitemaps, unsupported, missing: false };
}

export async function fetchRobots(origin: string): Promise<RobotsData> {
  const base = origin.replace(/\/$/, '');
  const url = `${base}/robots.txt`;
  const cached = cache.get(url);
  const headers: Record<string, string> = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;

  try {
    const res = await fetch(url, { headers });
    if (res.status === 304 && cached) {
      return cached.data;
    }
    if (!res.ok) {
      const data: RobotsData = { groups: [], sitemaps: [], unsupported: [], missing: true };
      cache.set(url, { etag: cached?.etag, data });
      return data;
    }
    const text = await res.text();
    const data = parseRobots(text);
    const etag = res.headers.get('etag') || undefined;
    cache.set(url, { etag, data });
    return data;
  } catch {
    const data: RobotsData = { groups: [], sitemaps: [], unsupported: [], missing: true };
    cache.set(url, { etag: cached?.etag, data });
    return data;
  }
}

export interface TestDecision {
  allowed: boolean;
  matchedRule: string | null;
  type: 'allow' | 'disallow' | null;
}

export function testPath(
  data: RobotsData,
  userAgent: string,
  path: string
): TestDecision {
  const ua = userAgent.toLowerCase();
  const rules: { type: 'allow' | 'disallow'; rule: string }[] = [];
  data.groups.forEach((g) => {
    if (g.userAgents.includes(ua) || g.userAgents.includes('*')) {
      g.allows.forEach((r) => rules.push({ type: 'allow', rule: r }));
      g.disallows.forEach((r) => rules.push({ type: 'disallow', rule: r }));
    }
  });
  let matchedRule: string | null = null;
  let matchedType: 'allow' | 'disallow' | null = null;
  let matchedLen = -1;
  rules.forEach((r) => {
    if (!r.rule) return;
    if (path.startsWith(r.rule)) {
      if (
        r.rule.length > matchedLen ||
        (r.rule.length === matchedLen && matchedType === 'disallow' && r.type === 'allow')
      ) {
        matchedRule = r.rule;
        matchedType = r.type;
        matchedLen = r.rule.length;
      }
    }
  });
  return {
    allowed: matchedType !== 'disallow',
    matchedRule,
    type: matchedType,
  };
}

export function clearRobotsCache() {
  cache.clear();
}

