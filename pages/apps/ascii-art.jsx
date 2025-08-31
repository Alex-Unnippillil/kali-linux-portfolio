import dynamic from '@/utils/dynamic';

const AsciiArt = dynamic(() => import('@/apps/ascii-art'), {
  ssr: false,
});

export default AsciiArt;
