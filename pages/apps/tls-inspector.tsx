import dynamic from 'next/dynamic';

const TLSInspector = dynamic(() => import('../../apps/tls-inspector'), {
  ssr: false,
});

export default function TLSInspectorPage() {
  return <TLSInspector />;
}
