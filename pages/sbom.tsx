import dynamic from 'next/dynamic';
import Head from 'next/head';

const SbomViewer = dynamic(() => import('../components/apps/sbom-viewer'), { ssr: false });

export default function SbomPage() {
  return (
    <>
      <Head>
        <title>SBOM Viewer</title>
        <meta
          name="description"
          content="Explore software bills of materials for dependencies, licenses and vulnerabilities."
        />
        <link rel="icon" href="/themes/Yaru/apps/sbom.svg" />
      </Head>
      <SbomViewer />
    </>
  );
}
