import { prisma } from '../../lib/db';

export const revalidate = 60; // ISR

export default async function CvesPage() {
  const cves = await prisma.cve.findMany({
    orderBy: { lastModified: 'desc' },
    take: 100,
    include: { cvssSnapshots: { orderBy: { createdAt: 'desc' }, take: 2 } }
  });
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">CVE Dashboard</h1>
      <table className="min-w-full text-sm border">
        <thead className="bg-gray-200 dark:bg-gray-800">
          <tr>
            <th className="p-2 border">CVE ID</th>
            <th className="p-2 border">Title</th>
            <th className="p-2 border">CVSS</th>
            <th className="p-2 border">Δ</th>
            <th className="p-2 border">Last Modified</th>
          </tr>
        </thead>
        <tbody>
          {cves.map(cve => {
            const snaps = cve.cvssSnapshots;
            const current = snaps[0];
            const previous = snaps[1];
            const delta = current && previous && current.baseScore != null && previous.baseScore != null
              ? current.baseScore - previous.baseScore
              : null;
            return (
              <tr key={cve.id} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800">
                <td className="p-2 border">{cve.id}</td>
                <td className="p-2 border">{cve.title || cve.description?.slice(0,50)}</td>
                <td className="p-2 border">{current?.baseScore?.toFixed(1) ?? 'n/a'}</td>
                <td className="p-2 border">{delta ? delta.toFixed(1) : ''}</td>
                <td className="p-2 border">{cve.lastModified.toISOString().split('T')[0]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
