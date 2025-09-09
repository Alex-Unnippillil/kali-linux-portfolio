import Head from 'next/head';
import dynamic from 'next/dynamic';

const Ghidra = dynamic(() => import('../../apps/ghidra'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function GhidraPage() {
  return (
    <>
      <Head>
        <title>Ghidra</title>
      </Head>
      <Ghidra />
    </>
  );
}
