import type { NextRequest } from 'next/server';

export const config = { runtime: 'edge' };

export interface MirrorInfo {
  url: string;
  country?: string;
  distance?: number;
}

export function pickMirror(
  geo: { country?: string | null },
  mirrors: Record<string, MirrorInfo>
): MirrorInfo {
  const list = Object.values(mirrors);
  if (list.length === 0) {
    throw new Error('No mirrors provided');
  }

  const country = geo.country?.toUpperCase();
  let best: MirrorInfo | null = null;
  let bestDist = Infinity;

  if (country) {
    for (const m of list) {
      if (m.country?.toUpperCase() === country) {
        const dist = m.distance ?? Infinity;
        if (dist < bestDist) {
          best = m;
          bestDist = dist;
        }
      }
    }
  }

  if (!best) {
    for (const m of list) {
      const dist = m.distance ?? Infinity;
      if (dist < bestDist) {
        best = m;
        bestDist = dist;
      }
    }
  }

  return best || list[0];
}

export default async function handler(req: NextRequest) {
  const res = await fetch('https://http.kali.org/mirrors/mirrorbits.json');
  const data = await res.json();
  const best = pickMirror(req.geo ?? {}, data.mirrors ?? {});
  return new Response(JSON.stringify(best), {
    headers: { 'content-type': 'application/json' },
  });
}
