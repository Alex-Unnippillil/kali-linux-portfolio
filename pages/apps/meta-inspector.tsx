import dynamic from 'next/dynamic';

const MetaInspector = dynamic(() => import('../../components/apps/meta-inspector'), { ssr: false });

export default function MetaInspectorPage() {
  return <MetaInspector />;
}
