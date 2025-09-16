import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const AsciiArt = dynamic(() => import('../../apps/ascii-art'), {
  ssr: false,
  loading: () => getAppSkeleton('ascii-art', 'ASCII Art'),
});

export default AsciiArt;
