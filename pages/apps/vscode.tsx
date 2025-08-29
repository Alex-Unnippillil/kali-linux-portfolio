import dynamic from 'next/dynamic';

const VSCode = dynamic(() => import('../../apps/vscode'), { ssr: false });

export default function VSCodePage() {
  return <VSCode />;
}
