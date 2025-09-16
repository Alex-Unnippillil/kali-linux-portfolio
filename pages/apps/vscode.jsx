import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/vscode');

const VSCode = dynamic(() => import('../../apps/vscode'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function VSCodePage() {
  return <VSCode />;
}
