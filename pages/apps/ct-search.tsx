import dynamic from 'next/dynamic';

const CtSearch = dynamic(() => import('../../components/apps/ct-search'), {
  ssr: false,
});

export default function CtSearchPage() {
  return <CtSearch />;
}
