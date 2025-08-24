import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

type Resource = {
  url: string;
  host: string;
  directive: string;
};

const DIRECTIVE_PATTERNS: Record<string, RegExp> = {
  'script-src': /<script[^>]*src=["']([^"']+)["'][^>]*>/gi,
  'img-src': /<img[^>]*src=["']([^"']+)["'][^>]*>/gi,
  'style-src': /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
};

function parseCsp(csp: string, origin: string): Record<string, string[]> {
  const directives: Record<string, string[]> = {};
  csp
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [dir, ...sources] = part.split(/\s+/);
      directives[dir] = sources.map((src) => (src === "'self'" ? origin : src));
    });
  return directives;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    | { resources: Record<string, Resource[]>; blocked: Resource[]; suggestions: { directive: string; host: string }[] }
    | { error: string }
  >
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { url, csp } = req.body || {};
  if (!url || !csp) {
    res.status(400).json({ error: 'Missing url or csp' });
    return;
  }

  try {
    const response = await fetch(url);
    const html = await response.text();
    const origin = new URL(url).origin;
    const allowed = parseCsp(csp, origin);

    const resources: Record<string, Resource[]> = {};
    const blocked: Resource[] = [];

    Object.entries(DIRECTIVE_PATTERNS).forEach(([directive, regex]) => {
      const list: Resource[] = [];
      let match;
      while ((match = regex.exec(html)) !== null) {
        const resourceUrl = new URL(match[1], url).href;
        const host = new URL(resourceUrl).origin;
        const allowedList = allowed[directive] || allowed['default-src'] || [];
        const isAllowed = allowedList.some((src) => src === '*' || src === host);
        const item = { url: resourceUrl, host, directive };
        list.push(item);
        if (!isAllowed) blocked.push(item);
      }
      if (list.length) resources[directive] = list;
    });

    const suggestions = blocked.map((b) => ({ directive: b.directive, host: b.host }));

    res.status(200).json({ resources, blocked, suggestions });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
