import dynamic from '@/utils/dynamic';

const VSCode = dynamic(() => import('../../apps/vscode'));

export default function VSCodePage() {
  return <VSCode />;
}
