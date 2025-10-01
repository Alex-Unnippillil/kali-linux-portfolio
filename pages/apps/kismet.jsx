import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const Kismet = dynamic(() => import('../../apps/kismet'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function KismetPage() {
  return <Kismet />;
}

export default withDeepLinkBoundary('kismet', KismetPage);
