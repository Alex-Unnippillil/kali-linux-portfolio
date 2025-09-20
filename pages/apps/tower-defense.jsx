import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/tower-defense');

const TowerDefense = dynamic(() => import('../../apps/tower-defense'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default TowerDefense;
