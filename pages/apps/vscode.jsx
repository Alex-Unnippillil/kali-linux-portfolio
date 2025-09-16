import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const VSCode = dynamic(() => import('../../apps/vscode'), {
  ssr: false,
  loading: () => getAppSkeleton('vscode', 'VSCode'),
});

export default function VSCodePage() {
  return <VSCode />;
}
