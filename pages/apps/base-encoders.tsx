import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const BaseEncoders = dynamic(() => import('../../apps/base-encoders'), {
  ssr: false,
});

export default function BaseEncodersPage() {
  return (
    <UbuntuWindow title="base encoders">
      <BaseEncoders />
    </UbuntuWindow>
  );
}
