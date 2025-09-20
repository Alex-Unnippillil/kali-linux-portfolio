import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/x');

const PageX = dynamic(() => import('../../apps/x'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default PageX;
