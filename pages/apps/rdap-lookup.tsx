import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const RdapLookup = dynamic(() => import('../../apps/rdap-lookup'), {
  ssr: false,
});

export default function RdapLookupPage() {
  return (
    <UbuntuWindow title="rdap lookup">
      <RdapLookup />
    </UbuntuWindow>
  );
}
