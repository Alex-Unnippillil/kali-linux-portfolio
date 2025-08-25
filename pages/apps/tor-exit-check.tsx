import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const TorExitCheck = dynamic(() => import('../../apps/tor-exit-check'), {
  ssr: false,
});

export default function TorExitCheckPage() {
  return (
    <UbuntuWindow title="tor exit check">
      <TorExitCheck />
    </UbuntuWindow>
  );
}
