import type { GetServerSideProps } from 'next';
import { getMirrorStatus, type MirrorStatus } from '../lib/mirrorStatus';

interface Props {
  mirror: MirrorStatus | null;
}

export default function MirrorStatusPage({ mirror }: Props) {
  if (!mirror) {
    return <div className="p-4">Mirror status unavailable.</div>;
  }

  return (
    <div className="p-4 space-y-2">
      <h1 className="text-xl font-bold">Mirror Status</h1>
      <p>Status: {mirror.status}</p>
      <p>
        Last sync:
        {' '}
        {mirror.last_sync ? new Date(mirror.last_sync).toLocaleString() : 'unknown'}
      </p>
      <div>
        <h2 className="font-semibold">Traffic</h2>
        <ul className="list-disc ml-5">
          {Object.entries(mirror.traffic || {}).map(([k, v]) => (
            <li key={k}>
              {k}: {v}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ res }) => {
  const mirror = await getMirrorStatus();
  // Cache result at the edge and revalidate every 10 minutes.
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=60');
  return { props: { mirror } };
};
