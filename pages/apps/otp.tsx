import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Otp = dynamic(() => import('../../apps/otp'), { ssr: false });

export default function OtpPage() {
  return (
    <UbuntuWindow title="otp">
      <Otp />
    </UbuntuWindow>
  );
}
