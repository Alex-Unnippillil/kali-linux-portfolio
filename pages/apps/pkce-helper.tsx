import dynamic from 'next/dynamic';

const PkceHelper = dynamic(() => import('../../apps/pkce-helper'), { ssr: false });

export default function PkceHelperPage() {
  return <PkceHelper />;
}
