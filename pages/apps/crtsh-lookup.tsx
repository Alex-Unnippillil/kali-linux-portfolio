import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const CrtshLookup = dynamic(() => import('../../apps/crtsh-lookup'), {
  ssr: false,
});

export default function CrtshLookupPage() {
  return (
    <UbuntuWindow title="crtsh lookup">
      <CrtshLookup />
    </UbuntuWindow>
  );
}
