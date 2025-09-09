import dynamic from 'next/dynamic';
import Head from 'next/head';

const TicTacToe = dynamic(() => import('../../../games/tic-tac-toe'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function TicTacToeGamePage() {
  return (
    <>
      <Head>
        <title>Tic Tac Toe Game</title>
        <meta
          name="description"
          content="Play Tic Tac Toe right in your browser."
        />
        <meta property="og:title" content="Tic Tac Toe Game" />
        <meta
          property="og:description"
          content="Play Tic Tac Toe right in your browser."
        />
        <meta
          property="og:image"
          content="https://unnippillil.com/images/wallpapers/wall-1.webp"
        />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Tic Tac Toe Game" />
        <meta
          property="twitter:description"
          content="Play Tic Tac Toe right in your browser."
        />
        <meta
          property="twitter:image"
          content="https://unnippillil.com/images/wallpapers/wall-1.webp"
        />
      </Head>
      <TicTacToe />
    </>
  );
}
