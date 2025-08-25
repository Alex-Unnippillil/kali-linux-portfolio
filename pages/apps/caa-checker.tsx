import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const CaaChecker = dynamic(() => import('../../apps/caa-checker'), {
  ssr: false,
});

export default function CaaCheckerPage() {
  return (
    <UbuntuWindow title="caa checker">
      <CaaChecker />
    </UbuntuWindow>
  );
}
