import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const ShodanNvd = dynamic(() => import('../../apps/shodan-nvd'), {
  ssr: false,
});

export default function ShodanNvdPage() {
  return (
    <UbuntuWindow title="shodan nvd">
      <ShodanNvd />
    </UbuntuWindow>
  );
}
