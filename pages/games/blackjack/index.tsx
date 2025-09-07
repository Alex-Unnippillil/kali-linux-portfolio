import dynamic from 'next/dynamic';
import Head from 'next/head';

const Blackjack = dynamic(() => import('../../../games/blackjack'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function BlackjackGamePage() {
  return (
    <>
      <Head>
        <title>Blackjack Game</title>
        <meta
          name="description"
          content="Play a quick round of Blackjack directly in your browser."
        />
        <meta property="og:title" content="Blackjack Game" />
        <meta
          property="og:description"
          content="Play a quick round of Blackjack directly in your browser."
        />
        <meta
          property="og:image"
          content="https://unnippillil.com/images/wallpapers/wall-1.webp"
        />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Blackjack Game" />
        <meta
          property="twitter:description"
          content="Play a quick round of Blackjack directly in your browser."
        />
        <meta
          property="twitter:image"
          content="https://unnippillil.com/images/wallpapers/wall-1.webp"
        />
      </Head>
      <Blackjack />
    </>
  );
}
