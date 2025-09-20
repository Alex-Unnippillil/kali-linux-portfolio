import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/solitaire');

const PageSolitaire = dynamic(() => import('../../apps/solitaire'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default PageSolitaire;
