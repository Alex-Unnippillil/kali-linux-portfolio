import React, { useCallback, useEffect, useState } from 'react';

interface Stats {
  wins: number;
  losses: number;
  pushes: number;
  bankroll: number;
}

const Profile: React.FC = () => {
  const [userId, setUserId] = useState('demo');
  const [token, setToken] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`/api/users/${userId}/blackjack`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setStats(await res.json());
    }
  }, [token, userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="p-4" aria-label="Profile dashboard">
      <h1 className="text-xl font-bold mb-2">Profile</h1>
      <label className="block mb-2">User ID:
        <input className="border p-1 ml-2" value={userId} onChange={(e) => setUserId(e.target.value)} aria-label="User ID" />
      </label>
      <label className="block mb-2">JWT Token:
        <input className="border p-1 ml-2" value={token} onChange={(e) => setToken(e.target.value)} aria-label="JWT token" />
      </label>
      <button className="btn mb-4" onClick={fetchStats} aria-label="Load stats">Load Stats</button>
      {stats && (
        <div>
          <div>Wins: {stats.wins}</div>
          <div>Losses: {stats.losses}</div>
          <div>Pushes: {stats.pushes}</div>
          <div>Bankroll: {stats.bankroll}</div>
        </div>
      )}
    </div>
  );
};

export default Profile;
