import dynamic from 'next/dynamic';
import Head from 'next/head';

const RedirectVisualizer = dynamic(() => import('../../apps/redirect-visualizer'), {
  ssr: false,
});

export default function RedirectVisualizerPage() {
  return (
    <>
      <Head>
        <title>Redirect Visualizer</title>
        <meta
          name="description"
          content="Trace HTTP redirect chains with method and cache insights"
        />
      </Head>
      <RedirectVisualizer />
    </>
  );
}

