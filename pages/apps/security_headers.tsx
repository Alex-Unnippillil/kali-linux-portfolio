import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const SecurityHeaders = dynamic(() => import('../../apps/security_headers'), {
  ssr: false,
});

export default function SecurityHeadersPage() {
  return (
    <UbuntuWindow title="security_headers">
      <SecurityHeaders />
    </UbuntuWindow>
  );
}
