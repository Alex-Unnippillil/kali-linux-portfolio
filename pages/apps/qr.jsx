import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const QRApp = dynamic(() => import('../../apps/qr'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function QRPage() {
  return <QRApp />;
}

export default withDeepLinkBoundary('qr', QRPage);
