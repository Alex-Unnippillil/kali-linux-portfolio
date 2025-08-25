import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const IpDnsLeak = dynamic(() => import('../../apps/ip-dns-leak'), {
  ssr: false,
});

export default function IpDnsLeakPage() {
  return (
    <UbuntuWindow title="ip dns leak">
      <IpDnsLeak />
    </UbuntuWindow>
  );
}
