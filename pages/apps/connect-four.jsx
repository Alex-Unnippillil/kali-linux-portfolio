import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/connect-four');

const ConnectFour = dynamic(() => import('../../apps/connect-four'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default ConnectFour;
