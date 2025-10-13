import dynamic from 'next/dynamic';

const VSCode = dynamic(() => import('../../apps/vscode'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function VSCodePage() {
  return <VSCode />;
}
