import Head from 'next/head';
import dynamic from 'next/dynamic';

const HelpApp = dynamic(() => import('@/components/apps/help'), { ssr: false });

export default function HelpPage() {
  return (
    <>
      <Head>
        <title>Help Center</title>
        <meta
          name="description"
          content="Search documentation, category guides, and recently viewed help topics for the Kali Linux portfolio."
        />
      </Head>
      <main className="min-h-screen bg-ub-terminal">
        <h1 className="sr-only">Help Center</h1>
        <HelpApp />
      </main>
    </>
  );
}
