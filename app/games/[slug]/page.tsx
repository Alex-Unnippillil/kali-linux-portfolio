import React from 'react';

export const dynamic = 'force-static';
export const revalidate = 60;
export const runtime = 'edge';

interface GamePageProps {
  params: { slug: string };
}

export default function GamePage({ params }: GamePageProps) {
  const { slug } = params;
  return (
    <main>
      <h1>Game: {slug}</h1>
    </main>
  );
}
