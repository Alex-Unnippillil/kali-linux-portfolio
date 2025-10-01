import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const InputLab = dynamic(() => import('../../apps/input-lab'), { ssr: false });

function InputLabPage() {
  return <InputLab />;
}

export default withDeepLinkBoundary('input-lab', InputLabPage);
