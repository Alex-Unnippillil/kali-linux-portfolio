import React from 'react';
import dynamicImport from 'next/dynamic';
import messages from '../../../messages/en.json';

export const dynamic = 'force-static';
export const revalidate = 60;
export const runtime = 'edge';

interface GamePageProps {
  params: { slug: string };
}

const Reversi = dynamicImport(() => import('../../../apps/reversi'), {
  ssr: false,
});

export default function GamePage({ params }: GamePageProps) {
  const { slug } = params;
  const heading = messages.gamePage.title.replace('{slug}', slug);
  if (slug === 'reversi') {
    return (
      <main role="main" aria-labelledby="game-heading">
        <Reversi />
      </main>
    );
  }
  return (
    <main role="main" aria-labelledby="game-heading">
      <h1 id="game-heading">{heading}</h1>
    </main>
  );
}
