import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const SwChecker = dynamic(() => import('../../apps/sw-checker'), {
  ssr: false,
});

export default function SwCheckerPage() {
  return (
    <UbuntuWindow title="sw checker">
      <SwChecker />
    </UbuntuWindow>
  );
}
