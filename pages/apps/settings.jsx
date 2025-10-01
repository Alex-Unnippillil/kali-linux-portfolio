import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const SettingsApp = dynamic(() => import('../../apps/settings'), { ssr: false });

function SettingsPage() {
  return <SettingsApp />;
}

export default withDeepLinkBoundary('settings', SettingsPage);
