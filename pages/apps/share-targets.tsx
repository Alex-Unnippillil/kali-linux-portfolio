import dynamic from 'next/dynamic';

const ShareTargetsApp = dynamic(() => import('../../apps/share-targets'), {
  ssr: false,
});

export default function ShareTargetsPage() {
  return <ShareTargetsApp />;
}
