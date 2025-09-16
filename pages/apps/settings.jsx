import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const SettingsApp = dynamic(() => import('../../apps/settings'), {
  ssr: false,
  loading: () => getAppSkeleton('settings', 'Settings'),
});

export default function SettingsPage() {
  return <SettingsApp />;
}
