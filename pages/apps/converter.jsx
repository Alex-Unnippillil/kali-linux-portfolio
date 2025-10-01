import dynamic from "next/dynamic";
import { withDeepLinkBoundary } from '../../utils/deeplink';

const Converter = dynamic(() => import("../../apps/converter"), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function ConverterPage() {
  return <Converter />;
}

export default withDeepLinkBoundary('converter', ConverterPage);
