import React, { useEffect } from 'react';
import { usePersistedState } from '../../hooks/usePersistedState';
import { dailySeed, generateSeedLink, getDailySeed } from '../../utils/seed';

/**
 * Simple shell component demonstrating persistent settings, accessibility
 * features and auto pause behaviour used in tests.
 */
export default function GameShell() {
  const [difficulty, setDifficulty] = usePersistedState('difficulty', 'easy');
  const [assist, setAssist] = usePersistedState('assist', false);
  const [quality, setQuality] = usePersistedState('quality', 1);
  const [highContrast, setHighContrast] = usePersistedState('highContrast', false);
  const [seenTutorial, setSeenTutorial] = usePersistedState('seen_tutorial_shell', false);
  const [paused, setPaused] = usePersistedState('paused', false);
  const [score, setScore] = usePersistedState('autosave_score', 0);
  const [seed] = usePersistedState('seed', typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('seed') || dailySeed) : dailySeed);

  // Auto-pause when the tab visibility changes
  useEffect(() => {
    const handler = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [setPaused]);

  // Save score whenever it changes to demonstrate auto-save
  useEffect(() => {
    // score state is already persisted via the hook
  }, [score]);

  const share = typeof window !== 'undefined' ? generateSeedLink(seed) : '';

  const addPoint = () => setScore(score + 1);

  return (
    <div>
      {!seenTutorial && (
        <div role="dialog" aria-label="Tutorial">
          <p>Use arrow keys to move.</p>
          <button onClick={() => setSeenTutorial(true)} aria-label="close tutorial">
            Start
          </button>
        </div>
      )}

      <div>
        <label htmlFor="difficulty-select">Difficulty</label>
        <select
          id="difficulty-select"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="easy">Easy</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <label>
        <input
          type="checkbox"
          aria-label="assist mode"
          checked={assist}
          onChange={(e) => setAssist(e.target.checked)}
        />
        Assist Mode
      </label>

      <div>
        <label htmlFor="quality-slider">Render Quality</label>
        <input
          id="quality-slider"
          type="range"
          min={1}
          max={3}
          value={quality}
          aria-label="render quality"
          onChange={(e) => setQuality(Number(e.target.value))}
        />
      </div>

      <label>
        <input
          type="checkbox"
          aria-label="high contrast mode"
          checked={highContrast}
          onChange={(e) => setHighContrast(e.target.checked)}
        />
        High Contrast
      </label>

      <div>
        <button onClick={addPoint} aria-label="increase score">
          Add Point
        </button>
        <span aria-live="polite" aria-label="current score">
          {score}
        </span>
      </div>

      <div data-testid="pause-indicator">{paused ? 'paused' : 'running'}</div>

      <div aria-label="share link" data-share-link={share} />
      <div aria-label="daily seed">{getDailySeed()}</div>
    </div>
  );
}
