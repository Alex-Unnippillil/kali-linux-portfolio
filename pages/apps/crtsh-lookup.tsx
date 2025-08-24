import dynamic from 'next/dynamic';

const CrtshLookup = dynamic(() => import('../../components/apps/crtsh-lookup'), {
  ssr: false,
});

export default function CrtshLookupPage() {
  return <CrtshLookup />;
}

