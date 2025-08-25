import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Ipv6Slaac = dynamic(() => import('../../apps/ipv6-slaac'), {
  ssr: false,
});

export default function Ipv6SlaacPage() {
  return (
    <UbuntuWindow title="ipv6 slaac">
      <Ipv6Slaac />
    </UbuntuWindow>
  );
}
