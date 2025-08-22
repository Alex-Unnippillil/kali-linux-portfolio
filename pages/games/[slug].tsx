import type { GetStaticPaths, GetStaticProps } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { games, getGame, type Game } from '../../lib/games';
import { trackEvent } from '../../lib/analytics';

interface Props {
  game: Game;
}

export default function GamePage({ game }: Props) {
  useEffect(() => {
    trackEvent('game_start', game.slug);
    return () => trackEvent('game_complete', game.slug);
  }, [game.slug]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{game.name}</h1>
      <Image src={game.image} alt={game.name} width={256} height={256} />
      <p className="mt-4">
        <Link href="/">Back home</Link>
      </p>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: games.map((g) => ({ params: { slug: g.slug } })),
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const slug = params?.slug as string;
  const game = getGame(slug);
  if (!game) {
    return { notFound: true };
  }
  return {
    props: { game },
    revalidate: 60,
  };
};
