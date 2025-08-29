import { NextRequest } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const take = parseInt(searchParams.get('take') || '50');
  const where = q
    ? {
        OR: [
          { id: { contains: q } },
          { title: { contains: q } },
          { description: { contains: q } },
        ],
      }
    : {};
  const cves = await prisma.cve.findMany({
    where,
    orderBy: { lastModified: 'desc' },
    take,
    include: { cvssSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  return Response.json(cves, {
    headers: {
      'Cache-Control': 'public, max-age=60',
      'ETag': 'W/"' + cves.length + '"',
    },
  });
}
