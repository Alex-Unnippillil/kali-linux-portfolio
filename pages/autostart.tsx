import dynamic from 'next/dynamic';

const Autostart = dynamic(() => import('../apps/settings/session-startup/autostart'), {
  ssr: false,
});

export default function AutostartPage() {
  return <Autostart />;
}
