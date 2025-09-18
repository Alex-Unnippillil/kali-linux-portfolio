import dynamic from 'next/dynamic';

const DefaultApps = dynamic(() => import('../../apps/default-apps'), { ssr: false });

export default function DefaultAppsPage() {
  return <DefaultApps />;
}

