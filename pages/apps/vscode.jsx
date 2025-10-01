import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const VSCode = dynamic(() => import('../../apps/vscode'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function VSCodePage() {
  return <VSCode />;
}

export default withDeepLinkBoundary('vscode', VSCodePage);
