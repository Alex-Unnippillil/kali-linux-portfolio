import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const AsnExplorer = dynamic(() => import('../../apps/asn-explorer'), {
  ssr: false,
});

export default function AsnExplorerPage() {
  return (
    <UbuntuWindow title="asn explorer">
      <AsnExplorer />
    </UbuntuWindow>
  );
}
