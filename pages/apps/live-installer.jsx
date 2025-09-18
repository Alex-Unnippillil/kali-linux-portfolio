import dynamic from 'next/dynamic';

const LiveInstallerPage = dynamic(
  () => import('../../components/apps/live-installer'),
  {
    ssr: false,
    loading: () => <p>Loading…</p>,
  },
);

export default function LiveInstallerRoute() {
  return <LiveInstallerPage />;
}
