import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const Simon = dynamic(() => import('../../apps/simon'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function SimonPage() {
  return <Simon />;
}

export default withDeepLinkBoundary('simon', SimonPage);
