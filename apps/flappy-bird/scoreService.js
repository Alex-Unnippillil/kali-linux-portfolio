const API = 'https://example.com/api';

export async function submitScore(score) {
  try {
    await fetch(`${API}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    });
  } catch (e) {
    console.error('Failed to submit score', e);
  }
}

export async function fetchLeaderboard(type = 'global') {
  try {
    const res = await fetch(`${API}/leaderboard?type=${type}`);
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch leaderboard', e);
    return [];
  }
}
