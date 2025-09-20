import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/figlet');

const FigletPage = dynamic(() => import('../../apps/figlet'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default FigletPage;
