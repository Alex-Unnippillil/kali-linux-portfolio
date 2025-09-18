import dynamic from 'next/dynamic';

const SettingsApp = dynamic(() => import('../../../apps/settings'), { ssr: false });

export default function AccessibilitySettingsPage() {
  return <SettingsApp initialTab="accessibility" />;
}
