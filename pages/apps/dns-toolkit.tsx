import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const DnsToolkit = dynamic(() => import('../../apps/dns-toolkit'), {
  ssr: false,
});

export default function DnsToolkitPage() {
  return (
    <UbuntuWindow title="dns toolkit">
      <DnsToolkit />
    </UbuntuWindow>
  );
}
