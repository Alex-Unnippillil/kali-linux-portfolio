import dynamic from 'next/dynamic';

const RequestBuilderApp = dynamic(() => import('../../apps/request-builder'), {
  ssr: false,
});

export default function RequestBuilderPage() {
  return <RequestBuilderApp />;
}
