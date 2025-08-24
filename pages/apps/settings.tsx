import dynamic from 'next/dynamic';
import Head from 'next/head';

const SettingsApp = dynamic(() => import('../../apps/settings'), { ssr: false });

export default function SettingsPage() {
  return (
    <>
      <Head>
        <title>Settings</title>
        <meta name="description" content="Manage application preferences" />
      </Head>
      <SettingsApp />
    </>
  );
}
