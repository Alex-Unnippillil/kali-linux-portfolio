import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Settings = dynamic(() => import('../../apps/settings'), { ssr: false });

export default function SettingsPage() {
  return (
    <UbuntuWindow title="settings">
      <Settings />
    </UbuntuWindow>
  );
}
