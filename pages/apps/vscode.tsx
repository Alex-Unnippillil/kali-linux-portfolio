import dynamic from 'next/dynamic';
import VsCodeSkeleton from '../../components/apps/VsCodeSkeleton';

const VSCode = dynamic(() => import('../../apps/vscode'), {
  ssr: false,
  loading: () => <VsCodeSkeleton />,
});

export default function VSCodePage() {
  return <VSCode />;
}
