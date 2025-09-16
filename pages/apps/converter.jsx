import dynamic from "next/dynamic";
import { getAppSkeleton } from '../../components/app-skeletons';

const Converter = dynamic(() => import("../../apps/converter"), {
  ssr: false,
  loading: () => getAppSkeleton('converter', 'Converter'),
});

export default function ConverterPage() {
  return <Converter />;
}
