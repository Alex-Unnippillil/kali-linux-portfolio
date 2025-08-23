import dynamic from 'next/dynamic';

const RDAPLookup = dynamic(() => import('../../apps/rdap-lookup'), { ssr: false });

export default function RDAPLookupPage() {
  return <RDAPLookup />;
}

