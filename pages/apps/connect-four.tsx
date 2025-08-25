import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const ConnectFour = dynamic(() => import('../../apps/connect-four'), {
  ssr: false,
});

export default function ConnectFourPage() {
  return (
    <UbuntuWindow title="connect four">
      <ConnectFour />
    </UbuntuWindow>
  );
}
