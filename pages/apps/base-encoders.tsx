import dynamic from 'next/dynamic';

const BaseEncoders = dynamic(() => import('../../apps/base-encoders'), {
  ssr: false,
});

export default function BaseEncodersPage() {
  return <BaseEncoders />;
}
