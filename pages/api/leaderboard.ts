export const config = { runtime: 'edge' };

const leaderboard = [
  { game: 'password', player: 'anon', score: 42 },
];

export default async function handler() {
  return new Response(JSON.stringify(leaderboard), {
    headers: {
      'content-type': 'application/json',
      // Cache at the edge for a minute and allow stale data for a day.
      'cache-control': 'public, s-maxage=60, stale-while-revalidate=86400',
    },
  });
}
