import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface NvdCve {
  cve: {
    id: string;
    published: string;
    lastModified: string;
    sourceIdentifier?: string;
    descriptions?: { value: string }[];
    metrics?: any;
    references?: { url: string }[];
    weaknesses?: { description?: { value: string }[] }[];
  };
}

function getCvss(cve: NvdCve) {
  const metrics = cve.cve.metrics;
  if (!metrics) return null;
  const v31 = metrics.cvssMetricV31?.[0];
  const v30 = metrics.cvssMetricV30?.[0];
  const metric = v31 || v30;
  if (!metric) return null;
  return {
    version: metric.cvssData.version as string,
    vectorString: metric.cvssData.vectorString as string,
    baseScore: metric.cvssData.baseScore as number,
    baseSeverity: metric.baseSeverity as string,
    metricsJson: metric
  };
}

function buildUrl(start: Date, end: Date, startIndex: number) {
  const params = new URLSearchParams({
    pubStartDate: start.toISOString(),
    pubEndDate: end.toISOString(),
    noRejected: 'true',
    resultsPerPage: '2000',
    startIndex: String(startIndex)
  });
  return `https://services.nvd.nist.gov/rest/json/cves/2.0?${params.toString()}`;
}

async function main() {
  const windowHoursArg = process.argv.find(a => a.startsWith('--window='));
  const windowHours = windowHoursArg ? parseInt(windowHoursArg.split('=')[1]) : 24 * 7;
  const end = new Date();
  const start = new Date(end.getTime() - windowHours * 60 * 60 * 1000);
  let startIndex = 0;
  let totalResults = 0;
  do {
    const url = buildUrl(start, end, startIndex);
    const headers: Record<string,string> = {};
    if (process.env.NVD_API_KEY) headers['apiKey'] = process.env.NVD_API_KEY;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`NVD fetch failed ${res.status}`);
    const json: any = await res.json();
    totalResults = json.totalResults;
    const items: NvdCve[] = json.vulnerabilities || [];
    for (const item of items) {
      const cve = item.cve;
      const description = cve.descriptions?.[0]?.value;
      const title = cve.sourceIdentifier;
      const cwes = (cve.weaknesses||[]).flatMap(w=>w.description?.map(d=>d.value)||[]);
      const references = (cve.references||[]).map(r=>r.url);
      await prisma.cve.upsert({
        where: { id: cve.id },
        update: {
          published: new Date(cve.published),
          lastModified: new Date(cve.lastModified),
          sourceIdentifier: cve.sourceIdentifier,
          title: title,
          description: description,
          cwes: cwes,
          references: references
        },
        create: {
          id: cve.id,
          published: new Date(cve.published),
          lastModified: new Date(cve.lastModified),
          sourceIdentifier: cve.sourceIdentifier,
          title: title,
          description: description,
          cwes: cwes,
          references: references
        }
      });
      const cvss = getCvss(item);
      if (cvss) {
        const lastSnap = await prisma.cvssSnapshot.findFirst({
          where: { cveId: cve.id },
          orderBy: { createdAt: 'desc' }
        });
        if (!lastSnap || lastSnap.baseScore !== cvss.baseScore || lastSnap.vectorString !== cvss.vectorString) {
          await prisma.cvssSnapshot.create({ data: { cveId: cve.id, ...cvss } });
          await prisma.changeEvent.create({ data: {
            cveId: cve.id,
            eventName: 'cvss_change',
            changedAt: new Date(),
            diffJson: { previous: lastSnap, current: cvss }
          }});
        }
      }
    }
    startIndex += items.length;
  } while (startIndex < totalResults);

  // update ingestion cursor
  await prisma.ingestionState.upsert({
    where: { id: 'nvd:cves' },
    update: { lastModCursor: end },
    create: { id: 'nvd:cves', lastModCursor: end }
  });
}

main().then(()=>{
  console.log('Ingestion complete');
}).catch(err=>{
  console.error(err);
  process.exit(1);
}).finally(()=>prisma.$disconnect());
