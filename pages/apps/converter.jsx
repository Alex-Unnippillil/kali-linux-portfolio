import dynamic from '@/utils/dynamic';

const Converter = dynamic(() => import('@/apps/converter'), {
  ssr: false,
});

export default function ConverterPage() {
  return <Converter />;
}
