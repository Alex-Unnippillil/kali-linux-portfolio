export interface CookieInfo {
  name: string;
  value: string;
  domain: string | null;
  path: string | null;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  expires: string | null;
  maxAge: string | null;
  expired: boolean;
  partitioned: boolean;
  issues: string[];
  rating: string;
}

function normalizeSameSite(v: string | null): string | null {
  if (!v) return null;
  const lower = v.toLowerCase();
  if (lower === 'lax') return 'Lax';
  if (lower === 'strict') return 'Strict';
  if (lower === 'none') return 'None';
  return null;
}

function rateCookie(c: Omit<CookieInfo, 'rating'>): string {
  let score = 0;
  if (c.secure) score += 1;
  if (c.httpOnly) score += 1;
  if (c.sameSite && c.sameSite.toLowerCase() !== 'none') score += 1;
  if (c.expires && !c.expired) score += 1;
  if (c.path === '/') score += 1;
  if (score === 5) return 'A';
  if (score === 4) return 'B';
  if (score === 3) return 'C';
  if (score === 2) return 'D';
  return 'F';
}

export function parseSetCookies(headers: string[]): CookieInfo[] {
  const results: CookieInfo[] = [];
  headers.forEach((cookieStr) => {
    const parts = cookieStr.split(';').map((p) => p.trim());
    if (parts.length === 0) return;
    const [nameValue, ...attrs] = parts;
    const eqIndex = nameValue.indexOf('=');
    const name = eqIndex >= 0 ? nameValue.slice(0, eqIndex) : nameValue;
    const value = eqIndex >= 0 ? nameValue.slice(eqIndex + 1) : '';

    const attrsLower = attrs.map((a) => a.toLowerCase());
    const secure = attrsLower.includes('secure');
    const httpOnly = attrsLower.includes('httponly');
    const partitioned = attrsLower.includes('partitioned');
    const sameSiteAttr = attrs.find((a) => /^samesite=/i.test(a));
    const sameSite = normalizeSameSite(sameSiteAttr ? sameSiteAttr.split('=')[1] : null);
    const domainAttr = attrs.find((a) => /^domain=/i.test(a));
    const domain = domainAttr ? domainAttr.split('=')[1] : null;
    const pathAttr = attrs.find((a) => /^path=/i.test(a));
    const path = pathAttr ? pathAttr.split('=')[1] : null;
    const expiresAttr = attrs.find((a) => /^expires=/i.test(a));
    const maxAgeAttr = attrs.find((a) => /^max-age=/i.test(a));
    const maxAge = maxAgeAttr ? maxAgeAttr.split('=')[1] : null;

    let expires: string | null = null;
    let expired = false;
    if (expiresAttr) {
      const dateStr = expiresAttr.split('=')[1];
      expires = dateStr;
      const date = new Date(dateStr);
      if (!Number.isNaN(date.getTime())) {
        expired = date.getTime() <= Date.now();
      }
    } else if (maxAge) {
      const age = parseInt(maxAge, 10);
      const date = new Date(Date.now() + age * 1000);
      expires = date.toUTCString();
      expired = age <= 0;
    }

    const issues: string[] = [];
    if (!secure) issues.push('Add Secure attribute to transmit cookie only over HTTPS.');
    if (!httpOnly) issues.push('Add HttpOnly to prevent access via JavaScript.');
    if (!sameSite) {
      issues.push('Add SameSite=Lax or Strict to mitigate CSRF.');
    } else if (sameSite.toLowerCase() === 'none') {
      issues.push('Avoid SameSite=None unless necessary.');
    }
    if (!expiresAttr && !maxAgeAttr) {
      issues.push('No expiry set; cookie will be a session cookie.');
    } else if (expired) {
      issues.push('Cookie is already expired.');
    }
    if (sameSite && sameSite.toLowerCase() === 'none' && !secure) {
      issues.push('SameSite=None requires the Secure attribute.');
    }
    if (expiresAttr && maxAgeAttr) {
      issues.push('Avoid using both Expires and Max-Age.');
    }
    if (!path) {
      issues.push('No Path attribute; cookie defaults to request path.');
    }
    if (domain && domain.startsWith('.')) {
      issues.push('Domain with leading dot is deprecated.');
    }
    if (partitioned) {
      if (!secure) issues.push('Partitioned cookies require the Secure attribute.');
      if (!sameSite || sameSite.toLowerCase() !== 'none') {
        issues.push('Partitioned cookies require SameSite=None.');
      }
      if (path !== '/') {
        issues.push('Partitioned cookies require Path=/');
      }
    }

    const base: Omit<CookieInfo, 'rating'> = {
      name,
      value,
      domain,
      path,
      secure,
      httpOnly,
      sameSite,
      expires,
      maxAge,
      expired,
      partitioned,
      issues,
    };

    const rating = rateCookie(base);
    results.push({ ...base, rating });
  });
  return results;
}

export function buildRecipe(c: CookieInfo): string {
  const attrs = [] as string[];
  if (c.domain) attrs.push(`Domain=${c.domain}`);
  if (c.path) attrs.push(`Path=${c.path}`);
  if (c.secure) attrs.push('Secure');
  if (c.httpOnly) attrs.push('HttpOnly');
  if (c.sameSite) attrs.push(`SameSite=${c.sameSite}`);
  if (c.expires) attrs.push(`Expires=${c.expires}`);
  if (c.maxAge) attrs.push(`Max-Age=${c.maxAge}`);
  if (c.partitioned) attrs.push('Partitioned');
  return `${c.name}=${c.value}; ${attrs.join('; ')}`;
}
