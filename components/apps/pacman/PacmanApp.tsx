"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameLayout, { useInputRecorder } from '../GameLayout';
import { VirtualPad, useLeaderboard } from '../Games/common';
import useGameInput from '../../../hooks/useGameInput';
import useCanvasResize from '../../../hooks/useCanvasResize';
import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';
import useIsTouchDevice from '../../../hooks/useIsTouchDevice';
import useGameAudio from '../../../hooks/useGameAudio';
import usePersistentState from '../../../hooks/usePersistentState';
import useGamepad from '../Games/common/useGamepad';
import MazeEditor from '../../../games/pacman/components/MazeEditor';
import { sanitizeLevel, validateLevelsPayload, type LevelDefinition } from '../../../apps/pacman/types';
import { type Direction, type EngineOptions } from '../../../apps/pacman/engine';
import { renderPacman } from './rendering/renderer';
import StartScreen from './ui/StartScreen';
import Hud from './ui/Hud';
import NameModal from './ui/NameModal';
import SettingsPanel from './ui/SettingsPanel';
import { usePacmanController } from './hooks/usePacmanController';

const TILE_SIZE = 20;

const DEFAULT_LEVEL: LevelDefinition = {
  name: 'Classic',
  maze: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,3,2,2,1,2,2,2,2,2,1,2,2,3,1],
    [1,2,1,2,1,2,1,1,1,2,1,2,1,2,1],
    [1,2,1,2,2,2,2,0,1,2,2,2,1,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  fruit: { x: 7, y: 3 },
  fruitTimes: [10, 30],
};

const DIFFICULTY_PRESETS = {
  classic: { label: 'Classic', pacSpeed: 4.5, ghostSpeeds: { scatter: 3.8, chase: 4.2 }, frightenedDuration: 6 },
  arcade: { label: 'Arcade', pacSpeed: 5.2, ghostSpeeds: { scatter: 4.2, chase: 4.8 }, frightenedDuration: 5 },
  hard: { label: 'Hard', pacSpeed: 5.8, ghostSpeeds: { scatter: 4.8, chase: 5.6 }, frightenedDuration: 4 },
};

const SCHEDULE = [
  { mode: 'scatter' as const, duration: 7 },
  { mode: 'chase' as const, duration: 20 },
  { mode: 'scatter' as const, duration: 7 },
  { mode: 'chase' as const, duration: 20 },
  { mode: 'scatter' as const, duration: 5 },
  { mode: 'chase' as const, duration: Number.POSITIVE_INFINITY },
];

type DifficultyKey = keyof typeof DIFFICULTY_PRESETS;
const isDifficultyKey = (value: unknown): value is DifficultyKey => typeof value === 'string' && value in DIFFICULTY_PRESETS;
const isGhostSpeeds = (value: unknown): value is { scatter: number; chase: number } => !!value && typeof (value as { scatter?: unknown }).scatter === 'number' && typeof (value as { chase?: unknown }).chase === 'number';
const isPositiveNumber = (value: unknown): value is number => typeof value === 'number' && value > 0;

const PacmanApp: React.FC<{ windowMeta?: { isFocused?: boolean } }> = ({ windowMeta } = {}) => {
  const isFocused = windowMeta?.isFocused ?? true;
  const prefersReducedMotion = usePrefersReducedMotion();
  const isTouch = useIsTouchDevice();
  const gamepad = useGamepad();
  const { playTone, muted, setMuted } = useGameAudio();
  const { scores: localScores, addScore } = useLeaderboard('pacman', 10);
  const { record, registerReplay } = useInputRecorder();

  const [levels, setLevels] = useState<LevelDefinition[]>([DEFAULT_LEVEL]);
  const [activeLevelIndex, setActiveLevelIndex] = useState(0);
  const [customLevel, setCustomLevel] = useState<LevelDefinition | null>(null);
  const [levelSearch, setLevelSearch] = useState('');
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [retroMode, setRetroMode] = usePersistentState('pacman:retroMode', false, (value) => typeof value === 'boolean');
  const [remoteScores, setRemoteScores] = useState<{ name: string; score: number }[]>([]);

  const [difficulty, setDifficulty] = usePersistentState('pacman:difficulty', 'classic', isDifficultyKey);
  const [ghostSpeeds, setGhostSpeeds] = usePersistentState('pacman:ghostSpeeds', DIFFICULTY_PRESETS.classic.ghostSpeeds, isGhostSpeeds);
  const [gameSpeed, setGameSpeed] = usePersistentState('pacman:gameSpeed', 1, isPositiveNumber);
  const [classicOnly, setClassicOnly] = usePersistentState('pacman:classicOnly', false, (value) => typeof value === 'boolean');
  const [randomLevels, setRandomLevels] = usePersistentState('pacman:randomLevels', false, (value) => typeof value === 'boolean');
  const [highScore, setHighScore] = usePersistentState('pacman:highScore', 0, (value) => typeof value === 'number');

  const activeLevel = customLevel ?? levels[activeLevelIndex] ?? DEFAULT_LEVEL;
  const canvasRef = useCanvasResize(activeLevel.maze[0].length * TILE_SIZE, activeLevel.maze.length * TILE_SIZE);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const options = useMemo<EngineOptions>(() => {
    const preset = DIFFICULTY_PRESETS[difficulty as keyof typeof DIFFICULTY_PRESETS] ?? DIFFICULTY_PRESETS.classic;
    return {
      speedMultiplier: gameSpeed,
      pacSpeed: preset.pacSpeed,
      ghostSpeeds,
      tunnelSpeed: 0.7,
      frightenedDuration: preset.frightenedDuration,
      scatterChaseSchedule: SCHEDULE,
      randomModeLevel: 2,
      levelIndex: activeLevelIndex,
      fruitDuration: 9,
      turnTolerance: 0.22,
      readyDuration: 1,
      deathDuration: 1,
    };
  }, [activeLevelIndex, difficulty, gameSpeed, ghostSpeeds]);

  const { state, selectors, setBufferedDirection, reset, renderTime } = usePacmanController({
    level: activeLevel,
    options,
    started,
    paused,
    onEvents: (events, nextState) => {
      if (nextState.score > highScore) setHighScore(nextState.score);
      if (events.energizer) setAnnouncement('Power pellet');
      if (events.lifeLost) setAnnouncement('Life lost');
      if (events.ready) playTone?.(600, { duration: 0.08, volume: 0.25 });
      if (events.levelComplete) setStatusMessage('Level complete!');
      if (events.gameOver) setStatusMessage('Game over');
      if (events.pellet) playTone?.(520, { duration: 0.03, volume: 0.2 });
      if (events.ghostEaten) playTone?.(160, { duration: 0.12, volume: 0.5 });
      if (events.fruit) playTone?.(720, { duration: 0.08, volume: 0.4 });
    },
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    contextRef.current = canvasRef.current.getContext('2d');
  }, [canvasRef]);

  useEffect(() => {
    if (!contextRef.current) return;
    renderPacman(contextRef.current, state, renderTime, {
      tileSize: TILE_SIZE,
      reducedMotion: prefersReducedMotion,
      retroMode,
    });
  }, [prefersReducedMotion, renderTime, retroMode, state]);

  const filteredLevels = useMemo(() => {
    const source = classicOnly ? levels.slice(0, 1) : levels;
    if (!levelSearch) return source;
    return source.filter((level) => (level.name ?? '').toLowerCase().includes(levelSearch.toLowerCase()));
  }, [classicOnly, levelSearch, levels]);

  const setDirection = useCallback((dir: Direction) => {
    setBufferedDirection(dir);
    record({ type: 'direction', dir });
  }, [record, setBufferedDirection]);

  useGameInput({
    game: 'pacman',
    isFocused,
    onInput: ({ action, type }) => {
      if (type !== 'keydown') return;
      if (action === 'action') {
        setStarted(true);
        record({ type: 'start' });
        return;
      }
      if (action === 'up') setDirection({ x: 0, y: -1 });
      if (action === 'down') setDirection({ x: 0, y: 1 });
      if (action === 'left') setDirection({ x: -1, y: 0 });
      if (action === 'right') setDirection({ x: 1, y: 0 });
    },
  });

  useEffect(() => {
    registerReplay((input) => {
      if (input.type === 'direction') setBufferedDirection(input.dir);
      if (input.type === 'start') setStarted(true);
      if (input.type === 'restart') reset();
    });
  }, [registerReplay, reset, setBufferedDirection]);

  useEffect(() => {
    if (!gamepad.connected) return;
    const [ax, ay] = gamepad.axes;
    const threshold = 0.5;
    if (Math.abs(ax) > Math.abs(ay) && Math.abs(ax) > threshold) setDirection({ x: Math.sign(ax), y: 0 });
    if (Math.abs(ay) >= Math.abs(ax) && Math.abs(ay) > threshold) setDirection({ x: 0, y: Math.sign(ay) });
  }, [gamepad, setDirection]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true') return;
    fetch('/api/pacman/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setRemoteScores(data);
      })
      .catch(() => setRemoteScores([]));
  }, []);

  useEffect(() => {
    fetch('/pacman-levels.json')
      .then((res) => res.json())
      .then((payload) => {
        if (!validateLevelsPayload(payload)) throw new Error('Invalid levels payload');
        const safeLevels = payload.levels.map((level) => sanitizeLevel(level));
        setLevels(safeLevels);
      })
      .catch(() => {
        setAnnouncement('Failed to load levels. Using built in level.');
        setLevels([DEFAULT_LEVEL]);
      });
  }, []);

  const handlePlayMaze = useCallback((level: LevelDefinition) => {
    setCustomLevel(sanitizeLevel(level));
    setStarted(true);
  }, []);

  const resetGame = useCallback(() => {
    reset();
    setStarted(true);
    setPaused(false);
    setStatusMessage('');
    setShowNameModal(false);
    setPlayerName('');
    record({ type: 'restart' });
  }, [record, reset]);

  const finalizeScore = useCallback(async () => {
    const score = state.score;
    const name = playerName.trim().slice(0, 16) || 'Player';
    addScore(name, score);
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
      try {
        const response = await fetch('/api/pacman/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, score }),
        });
        const data = await response.json();
        if (Array.isArray(data)) setRemoteScores(data);
      } catch {
        // noop
      }
    }
    setShowNameModal(false);
  }, [addScore, playerName, state.score]);

  const scoreList = remoteScores.length ? remoteScores : localScores;

  const settingsPanel = (
    <SettingsPanel
      difficulty={difficulty}
      setDifficulty={(value) => setDifficulty(value as DifficultyKey)}
      difficultyPresets={DIFFICULTY_PRESETS}
      muted={muted}
      setMuted={setMuted}
      classicOnly={classicOnly}
      setClassicOnly={setClassicOnly}
      randomLevels={randomLevels}
      setRandomLevels={setRandomLevels}
      showEditor={showEditor}
      setShowEditor={setShowEditor}
      ghostSpeeds={ghostSpeeds}
      setGhostSpeeds={setGhostSpeeds}
      gameSpeed={gameSpeed}
      setGameSpeed={setGameSpeed}
      retroMode={retroMode}
      setRetroMode={setRetroMode}
    />
  );

  const selectedLevelName = activeLevel.name || `Level ${activeLevelIndex + 1}`;

  return (
    <GameLayout
      gameId="pacman"
      stage={customLevel ? undefined : activeLevelIndex + 1}
      lives={selectors.lives}
      score={selectors.score}
      highScore={highScore}
      onPauseChange={setPaused}
      onRestart={resetGame}
      pauseHotkeys={['Escape', 'p']}
      restartHotkeys={['r']}
      settingsPanel={settingsPanel}
      isFocused={isFocused}
      editor={showEditor ? <div className="rounded bg-slate-900/80 p-2 text-xs text-slate-100 shadow-lg"><MazeEditor onPlay={handlePlayMaze} /></div> : null}
    >
      <div className="relative flex h-full w-full flex-col bg-ub-cool-grey text-white">
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          <canvas
            ref={canvasRef}
            width={activeLevel.maze[0].length * TILE_SIZE}
            height={activeLevel.maze.length * TILE_SIZE}
            className="max-h-full max-w-full rounded-md bg-black shadow-inner"
            role="img"
            aria-label="Pacman playfield"
          />
          {!started && (
            <StartScreen
              levelSearch={levelSearch}
              onLevelSearchChange={setLevelSearch}
              filteredLevels={filteredLevels}
              allLevels={levels}
              activeLevelIndex={activeLevelIndex}
              onSelectLevel={(index) => {
                setActiveLevelIndex(index);
                setCustomLevel(null);
              }}
              onStart={() => setStarted(true)}
              scoreList={scoreList}
            />
          )}
          {selectors.status === 'gameover' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
              <div className="text-lg font-semibold">Game Over</div>
              <button type="button" className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900" onClick={resetGame}>Restart</button>
              <button type="button" className="rounded bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900" onClick={() => setShowNameModal(true)}>Save score</button>
            </div>
          )}
        </div>
        <Hud mode={selectors.mode} pellets={selectors.pellets} levelLabel={selectedLevelName} statusMessage={statusMessage} />
        {isTouch && <div className="mt-4"><VirtualPad onDirection={setDirection} /></div>}
        {paused && <div className="mt-3 text-xs text-slate-300">Paused - press Escape to resume</div>}
        <div className="sr-only" aria-live="polite">{announcement}</div>
      </div>
      <NameModal
        isOpen={showNameModal}
        playerName={playerName}
        setPlayerName={setPlayerName}
        onClose={() => setShowNameModal(false)}
        onSave={finalizeScore}
      />
    </GameLayout>
  );
};

export default PacmanApp;
