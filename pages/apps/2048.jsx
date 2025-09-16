import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/2048');

const Page2048 = dynamic(() => import('../../apps/2048'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default Page2048;
