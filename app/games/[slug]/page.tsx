import React from 'react';
import dynamicImport from 'next/dynamic';

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
  if (slug === 'reversi') {
    return (
      <main>
        <Reversi />
      </main>
    );
  }
  return (
    <main>
      <h1>Game: {slug}</h1>
    </main>
  );
}
