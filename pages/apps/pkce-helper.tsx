import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const PkceHelper = dynamic(() => import('../../apps/pkce-helper'), {
  ssr: false,
});

export default function PkceHelperPage() {
  return (
    <UbuntuWindow title="pkce helper">
      <PkceHelper />
    </UbuntuWindow>
  );
}
