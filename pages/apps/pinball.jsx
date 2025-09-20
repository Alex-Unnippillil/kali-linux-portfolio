import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/pinball');

const Pinball = dynamic(() => import('../../apps/pinball'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default Pinball;
