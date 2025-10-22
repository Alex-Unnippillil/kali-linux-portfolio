import Head from 'next/head';

import BeefPage from '../../apps/beef';

export default function BeefRoute() {
  return (
    <>
      <Head>
        <title>BeEF Lab Dashboard | Kali Linux Portfolio</title>
        <meta
          name="description"
          content="Simulated BeEF dashboard with lab-mode gating, hook tracking, module explorer, and command composer."
        />
      </Head>
      <BeefPage />
    </>
  );
}
