import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const CorsChecker = dynamic(() => import('../../apps/cors-checker'), {
  ssr: false,
});

export default function CorsCheckerPage() {
  return (
    <UbuntuWindow title="cors checker">
      <CorsChecker />
    </UbuntuWindow>
  );
}
