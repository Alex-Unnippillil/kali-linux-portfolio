import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const ArgonBcryptDemo = dynamic(() => import('../../apps/argon-bcrypt-demo'), {
  ssr: false,
});

export default function ArgonBcryptDemoPage() {
  return (
    <UbuntuWindow title="argon bcrypt demo">
      <ArgonBcryptDemo />
    </UbuntuWindow>
  );
}
