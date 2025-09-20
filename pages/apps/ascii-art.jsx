import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/ascii-art');

const AsciiArt = dynamic(() => import('../../apps/ascii-art'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default AsciiArt;
