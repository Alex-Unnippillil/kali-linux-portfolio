import { getPageMetadata } from '@/lib/metadata';
import dynamic from "next/dynamic";
export const metadata = getPageMetadata('/apps/converter');

const Converter = dynamic(() => import("../../apps/converter"), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function ConverterPage() {
  return <Converter />;
}
