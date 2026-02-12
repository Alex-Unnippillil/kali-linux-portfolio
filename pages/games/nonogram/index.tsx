import dynamic from 'next/dynamic';
import Head from 'next/head';

const Nonogram = dynamic(() => import('../../../games/nonogram'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function NonogramPage() {
  return (
    <>
      <Head>
        <title>Nonogram Game</title>
        <meta
          name="description"
          content="Solve Nonogram puzzles directly in your browser."
        />
        <meta property="og:title" content="Nonogram Game" />
        <meta
          property="og:description"
          content="Solve Nonogram puzzles directly in your browser."
        />
        <meta
          property="og:image"
          content="https://unnippillil.com/images/wallpapers/wall-1.webp"
        />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Nonogram Game" />
        <meta
          property="twitter:description"
          content="Solve Nonogram puzzles directly in your browser."
        />
        <meta
          property="twitter:image"
          content="https://unnippillil.com/images/wallpapers/wall-1.webp"
        />
      </Head>
      <Nonogram />
    </>
  );
}

