import dynamic from '@/utils/dynamic';

const VSCode = dynamic(() => import('@/apps/vscode'), {
  ssr: false,
});

export default function VSCodePage() {
  return <VSCode />;
}
