import dynamic from 'next/dynamic';

const EntropyExplorer = dynamic(() => import('../../apps/entropy-explorer'), {
  ssr: false,
});

export default function EntropyExplorerPage() {
  return <EntropyExplorer />;
}
