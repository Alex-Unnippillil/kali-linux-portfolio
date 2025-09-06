"use client";

import React, { useState } from "react";

const KNOWN_PLAYERS = ["Rhythmbox", "VLC", "Spotify"] as const;

export default function VolumeProperties() {
  const [nowPlaying, setNowPlaying] = useState<string[]>([...KNOWN_PLAYERS]);

  const clearPlayer = (player: string) => {
    setNowPlaying((prev) => prev.filter((p) => p !== player));
    // Simulate the player starting again after 5 seconds
    setTimeout(() => {
      setNowPlaying((prev) =>
        prev.includes(player) ? prev : [...prev, player]
      );
    }, 5000);
  };

  const restorePlayer = (player: string) => {
    setNowPlaying((prev) =>
      prev.includes(player) ? prev : [...prev, player]
    );
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-ubt-grey">Known Players</h2>
      <ul className="space-y-2">
        {KNOWN_PLAYERS.map((player) => {
          const playing = nowPlaying.includes(player);
          return (
            <li key={player} className="flex items-center justify-between">
              <span className="text-white">{player}</span>
              {playing ? (
                <button
                  className="bg-ub-cool-grey text-white px-2 py-1 rounded"
                  onClick={() => clearPlayer(player)}
                >
                  Clear
                </button>
              ) : (
                <button
                  className="bg-ub-cool-grey text-white px-2 py-1 rounded"
                  onClick={() => restorePlayer(player)}
                >
                  Restore
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div>
        <h3 className="text-ubt-grey">Now Playing</h3>
        {nowPlaying.length ? (
          <ul className="list-disc pl-5 text-white">
            {nowPlaying.map((player) => (
              <li key={player}>{player}</li>
            ))}
          </ul>
        ) : (
          <p className="text-ubt-grey">Nothing currently playing.</p>
        )}
      </div>
    </div>
  );
}

