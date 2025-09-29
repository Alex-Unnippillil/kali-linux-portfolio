import dynamic from '@/utils/dynamic';

const SettingsApp = dynamic(() => import('../../apps/settings'));

export default function SettingsPage() {
  return <SettingsApp />;
}

