import dynamic from 'next/dynamic';

const RecentsApp = dynamic(() => import('../../apps/system/Recents'), {
  ssr: false,
});

export default function RecentsPage() {
  return <RecentsApp />;
}

