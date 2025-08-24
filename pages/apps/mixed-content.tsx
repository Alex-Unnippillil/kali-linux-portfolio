import dynamic from 'next/dynamic';

const MixedContent = dynamic(() => import('../../apps/mixed-content'), {
  ssr: false,
});

export default function MixedContentPage() {
  return <MixedContent />;
}
