import dynamic from 'next/dynamic';
import { getDailySeed } from '../../utils/dailySeed';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const PasswordGenerator = dynamic(() => import('../../apps/password_generator'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function PasswordGeneratorPage() {
  return <PasswordGenerator getDailySeed={() => getDailySeed('password_generator')} />;
}

export default withDeepLinkBoundary('password_generator', PasswordGeneratorPage);
