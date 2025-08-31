import dynamic from '@/utils/dynamic';

const SettingsApp = dynamic(() => import('@/apps/settings'), { ssr: false });

export default function SettingsPage() {
  return <SettingsApp />;
}

