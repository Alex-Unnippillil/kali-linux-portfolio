import dynamic from 'next/dynamic';

const Autostart = dynamic(
  () => import('../../../../apps/settings/session-startup/autostart'),
  { ssr: false, loading: () => <p>Loading...</p> }
);

export default function AutostartPage() {
  return <Autostart />;
}
