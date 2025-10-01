import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const TowerDefense = dynamic(() => import('../../apps/tower-defense'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default withDeepLinkBoundary('tower-defense', TowerDefense);
