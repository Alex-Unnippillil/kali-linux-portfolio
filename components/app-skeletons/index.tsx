import React from 'react';

type SkeletonRenderer = () => React.ReactElement;

const SkeletonLine = ({ className = '' }: { className?: string }) => (
  <div className={`rounded bg-white/15 ${className} animate-pulse`} aria-hidden="true" />
);

const SkeletonCircle = ({ className = '' }: { className?: string }) => (
  <div className={`rounded-full bg-white/15 ${className} animate-pulse`} aria-hidden="true" />
);

const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <div className={`rounded-lg border border-white/10 bg-white/[0.05] ${className}`}>
    <div className="h-full w-full rounded-lg bg-gradient-to-br from-white/[0.12] to-transparent animate-pulse" />
  </div>
);

const skeletons: Record<string, SkeletonRenderer> = {};

const registerSkeleton = (ids: string[], renderer: SkeletonRenderer) => {
  ids.forEach((id) => {
    skeletons[id] = renderer;
  });
};

const normalizeAppId = (id: string) =>
  id
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^apps\//, '')
    .replace(/^components\/apps\//, '')
    .replace(/\.jsx?$/, '')
    .replace(/\/index$/, '')
    .replace(/\/pages$/, '')
    .toLowerCase();

const DefaultSkeleton = (title?: string) => (
  <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white" aria-busy="true">
    <SkeletonCircle className="h-12 w-12 mb-4" />
    <span className="text-sm text-white/70">
      {title ? `Loading ${title}…` : 'Loading app…'}
    </span>
  </div>
);
const TerminalSkeleton: SkeletonRenderer = () => (
  <div className="h-full w-full overflow-y-auto bg-black text-white" aria-busy="true">
    <div className="p-4 space-y-3">
      <SkeletonLine className="h-4 w-40" />
      <SkeletonLine className="h-3 w-56" />
    </div>
    <div className="mx-4 mb-4 rounded-lg border border-white/10 bg-white/[0.08]">
      <div className="h-[22rem] w-full rounded-lg bg-gradient-to-b from-white/[0.18] to-transparent animate-pulse" />
    </div>
  </div>
);

const MediaFrameSkeleton: SkeletonRenderer = () => (
  <div className="h-full w-full flex flex-col bg-black text-white" aria-busy="true">
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
      <SkeletonLine className="h-6 w-48" />
      <div className="flex gap-2">
        <SkeletonCircle className="h-4 w-4" />
        <SkeletonCircle className="h-4 w-4" />
        <SkeletonCircle className="h-4 w-4" />
      </div>
    </div>
    <div className="flex-1">
      <div className="h-full w-full bg-gradient-to-br from-white/[0.15] to-transparent animate-pulse" />
    </div>
  </div>
);

const VsCodeSkeleton: SkeletonRenderer = () => (
  <div className="flex h-full w-full max-w-full flex-col bg-[#1f1f1f] text-white min-[1366px]:flex-row" aria-busy="true">
    <aside className="flex min-[1366px]:h-full min-[1366px]:flex-col items-center gap-3 bg-black/60 p-2">
      <SkeletonCircle className="h-10 w-10" />
      <SkeletonCircle className="h-10 w-10" />
      <SkeletonCircle className="h-10 w-10" />
    </aside>
    <div className="flex-1 flex flex-col overflow-hidden border border-white/10 bg-black/50">
      <div className="flex items-center justify-end gap-3 border-b border-white/10 px-3 py-2">
        <SkeletonCircle className="h-3 w-3" />
        <SkeletonCircle className="h-3 w-3" />
        <SkeletonCircle className="h-3 w-3" />
      </div>
      <div className="relative flex-1 bg-black/60">
        <div className="h-full w-full bg-gradient-to-br from-white/[0.12] to-transparent animate-pulse" />
        <div className="absolute left-4 top-4 flex items-center gap-4 rounded bg-black/70 p-4">
          <SkeletonCircle className="h-12 w-12" />
          <SkeletonLine className="h-4 w-28" />
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2">
        <SkeletonLine className="h-5 w-20" />
        <SkeletonLine className="h-5 w-16" />
      </div>
    </div>
  </div>
);
const SpotifySkeleton: SkeletonRenderer = () => (
  <div className="flex h-full w-full flex-col gap-4 bg-black p-4 text-white" aria-busy="true">
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <SkeletonCircle className="h-14 w-14" />
        <div className="space-y-2">
          <SkeletonLine className="h-5 w-40" />
          <SkeletonLine className="h-3 w-24" />
        </div>
      </div>
      <div className="flex gap-2">
        <SkeletonCircle className="h-10 w-10" />
        <SkeletonCircle className="h-10 w-10" />
        <SkeletonCircle className="h-10 w-10" />
      </div>
    </div>
    <div className="flex flex-1 flex-col gap-4 lg:flex-row">
      <SkeletonCard className="h-64 flex-1" />
      <div className="flex h-64 flex-1 flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-4">
        <SkeletonLine className="h-4 w-3/5" />
        <SkeletonLine className="h-4 w-4/5" />
        <SkeletonLine className="h-4 w-2/5" />
        <SkeletonLine className="h-4 w-1/2" />
      </div>
    </div>
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <SkeletonCard key={idx} className="h-24" />
      ))}
    </div>
  </div>
);

const XTimelineSkeleton: SkeletonRenderer = () => (
  <div className="flex h-full w-full flex-col gap-4 bg-[#0f1419] p-4 text-white" aria-busy="true">
    <div className="flex flex-wrap items-center gap-2">
      <SkeletonLine className="h-8 w-32" />
      <SkeletonLine className="h-8 w-28" />
      <SkeletonLine className="h-8 w-24" />
    </div>
    <SkeletonCard className="h-28" />
    <div className="flex flex-1 gap-4">
      <div className="flex-1 space-y-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <SkeletonCard key={idx} className="h-32" />
        ))}
      </div>
      <div className="hidden w-64 flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.05] p-4 lg:flex">
        <SkeletonLine className="h-4 w-3/4" />
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-5/6" />
      </div>
    </div>
  </div>
);

const BeefSkeleton: SkeletonRenderer = () => (
  <div className="flex h-full w-full flex-col bg-ub-cool-grey text-white" aria-busy="true">
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
      <div className="flex items-center gap-3">
        <SkeletonCircle className="h-12 w-12" />
        <SkeletonLine className="h-5 w-32" />
      </div>
      <div className="flex gap-2">
        <SkeletonCircle className="h-6 w-6" />
        <SkeletonCircle className="h-6 w-6" />
      </div>
    </div>
    <div className="flex-1 overflow-hidden p-4">
      <SkeletonCard className="h-full" />
    </div>
    <div className="border-t border-white/10 p-3 space-y-2">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <SkeletonLine className="h-5 w-16" />
          <SkeletonLine className="h-4 w-20" />
          <SkeletonLine className="h-4 flex-1" />
        </div>
      ))}
    </div>
  </div>
);

const AnalyzerSkeleton: SkeletonRenderer = () => (
  <div className="flex h-full w-full bg-ub-cool-grey text-white" aria-busy="true">
    <div className="hidden w-64 flex-shrink-0 flex-col gap-3 border-r border-white/10 p-4 lg:flex">
      <SkeletonLine className="h-6 w-full" />
      <SkeletonLine className="h-4 w-5/6" />
      <SkeletonLine className="h-4 w-2/3" />
      <SkeletonLine className="h-4 w-3/4" />
      <SkeletonLine className="h-4 w-full" />
    </div>
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <SkeletonLine className="h-6 w-40" />
        <div className="flex gap-2">
          <SkeletonLine className="h-6 w-16" />
          <SkeletonLine className="h-6 w-16" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
        <SkeletonCard className="h-1/2 min-h-[200px]" />
        <SkeletonCard className="flex-1 min-h-[200px]" />
      </div>
    </div>
  </div>
);

const AutopsySkeleton: SkeletonRenderer = () => (
  <div className="h-full w-full space-y-4 bg-ub-cool-grey p-4 text-white" aria-busy="true">
    <div className="flex gap-2">
      <SkeletonLine className="h-9 w-28" />
      <SkeletonLine className="h-9 w-36" />
    </div>
    <SkeletonCard className="h-72" />
    <SkeletonCard className="h-72" />
  </div>
);

const VolatilitySkeleton: SkeletonRenderer = () => (
  <div className="h-full w-full space-y-4 bg-ub-cool-grey p-4 text-white" aria-busy="true">
    <SkeletonCard className="h-80" />
    <SkeletonCard className="h-40" />
  </div>
);

const WiresharkSkeleton: SkeletonRenderer = () => (
  <div className="flex h-full w-full flex-col bg-ub-cool-grey text-white" aria-busy="true">
    <div className="px-4 pt-3">
      <SkeletonLine className="h-8 w-32" />
    </div>
    <div className="flex-1 p-4">
      <SkeletonCard className="h-full" />
    </div>
  </div>
);

const ProjectGallerySkeleton: SkeletonRenderer = () => (
  <div className="h-full w-full space-y-4 bg-ub-cool-grey p-4 text-white" aria-busy="true">
    <div className="flex flex-wrap gap-2">
      <SkeletonLine className="h-8 w-32" />
      <SkeletonLine className="h-8 w-28" />
      <SkeletonLine className="h-8 w-24" />
      <SkeletonLine className="h-8 w-20" />
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <SkeletonCard key={idx} className="h-48" />
      ))}
    </div>
  </div>
);
const GameSkeleton: SkeletonRenderer = () => (
  <div className="flex h-full w-full flex-col gap-4 bg-ub-cool-grey p-4 text-white" aria-busy="true">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <SkeletonLine className="h-8 w-32" />
      <div className="flex gap-2">
        <SkeletonLine className="h-6 w-16" />
        <SkeletonLine className="h-6 w-16" />
        <SkeletonLine className="h-6 w-16" />
      </div>
    </div>
    <div className="flex flex-1 flex-col gap-4 md:flex-row">
      <SkeletonCard className="flex-1 min-h-[260px]" />
      <div className="flex w-full flex-col gap-3 md:w-64">
        <SkeletonLine className="h-6 w-full" />
        <SkeletonLine className="h-6 w-5/6" />
        <SkeletonLine className="h-6 w-4/6" />
        <SkeletonLine className="h-6 w-3/6" />
      </div>
    </div>
    <SkeletonLine className="h-10 w-full" />
  </div>
);

const WordSearchSkeleton: SkeletonRenderer = () => (
  <div className="flex h-full w-full flex-col gap-4 bg-ub-cool-grey p-4 text-white" aria-busy="true">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <SkeletonLine className="h-8 w-36" />
      <SkeletonLine className="h-6 w-24" />
    </div>
    <div className="flex flex-1 flex-col gap-4 lg:flex-row">
      <div className="grid aspect-square w-full max-w-xl grid-cols-12 gap-1">
        {Array.from({ length: 36 }).map((_, idx) => (
          <SkeletonLine key={idx} className="h-6 w-full" />
        ))}
      </div>
      <div className="flex w-full flex-col gap-2 lg:w-64">
        {Array.from({ length: 8 }).map((_, idx) => (
          <SkeletonLine key={idx} className="h-6 w-full" />
        ))}
      </div>
    </div>
    <SkeletonLine className="h-10 w-full" />
  </div>
);

const FormSkeleton: SkeletonRenderer = () => (
  <div className="min-h-screen bg-gray-900 p-4 text-white space-y-4" aria-busy="true">
    <SkeletonLine className="h-8 w-40" />
    <SkeletonLine className="h-4 w-60" />
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          <SkeletonLine className="h-4 w-32" />
          <SkeletonLine className="h-10 w-full" />
        </div>
      ))}
    </div>
    <div className="flex gap-3">
      <SkeletonLine className="h-10 w-32" />
      <SkeletonLine className="h-10 w-32" />
    </div>
  </div>
);

const WeatherSkeleton: SkeletonRenderer = () => (
  <div className="h-full w-full space-y-4 bg-ub-cool-grey p-4 text-white" aria-busy="true">
    <div className="flex flex-wrap gap-2">
      <SkeletonLine className="h-9 w-28" />
      <SkeletonLine className="h-9 w-40" />
      <SkeletonLine className="h-9 w-32" />
      <SkeletonLine className="h-9 w-28" />
    </div>
    <div className="grid gap-4 lg:grid-cols-[2fr,3fr]">
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <SkeletonCard key={idx} className="h-24" />
        ))}
      </div>
      <SkeletonCard className="min-h-[300px]" />
    </div>
  </div>
);

const WidgetSkeleton: SkeletonRenderer = () => (
  <div className="h-full w-full space-y-4 bg-ub-cool-grey p-4 text-white" aria-busy="true">
    <div className="flex gap-2">
      <SkeletonLine className="h-8 w-24" />
      <SkeletonLine className="h-8 w-24" />
      <SkeletonLine className="h-8 w-24" />
    </div>
    <SkeletonCard className="h-56" />
    <SkeletonLine className="h-10 w-40" />
  </div>
);

const StickyNotesSkeleton: SkeletonRenderer = () => (
  <div className="h-full w-full space-y-4 bg-ub-cool-grey p-4 text-white" aria-busy="true">
    <div className="flex gap-2">
      <SkeletonLine className="h-9 w-32" />
      <SkeletonLine className="h-9 w-24" />
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <SkeletonCard key={idx} className="h-32" />
      ))}
    </div>
  </div>
);

const SettingsSkeleton: SkeletonRenderer = () => (
  <div className="flex h-full w-full flex-col bg-ub-cool-grey text-white" aria-busy="true">
    <div className="border-b border-white/10 px-4 py-3">
      <div className="flex gap-3">
        <SkeletonLine className="h-8 w-28" />
        <SkeletonLine className="h-8 w-28" />
        <SkeletonLine className="h-8 w-28" />
      </div>
    </div>
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      <SkeletonCard className="h-48" />
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <SkeletonLine key={idx} className="h-10 w-10 rounded-full" />
        ))}
      </div>
      <SkeletonLine className="h-6 w-48" />
      <SkeletonCard className="h-40" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <SkeletonCard key={idx} className="h-36" />
        ))}
      </div>
    </div>
  </div>
);
registerSkeleton(['terminal'], TerminalSkeleton);
registerSkeleton(['vscode'], VsCodeSkeleton);
registerSkeleton(['spotify'], SpotifySkeleton);
registerSkeleton(['youtube'], MediaFrameSkeleton);
registerSkeleton(['x'], XTimelineSkeleton);
registerSkeleton(['beef'], BeefSkeleton);

registerSkeleton(
  [
    'metasploit',
    'metasploit-post',
    'msf-post',
    'radare2',
    'ghidra',
    'file-explorer',
    'plugin-manager',
    'security-tools',
    'dsniff',
    'nmap-nse',
    'john',
    'kismet',
    'mimikatz',
    'mimikatz/offline',
    'nessus',
    'openvas',
    'reconng',
    'recon-ng',
    'evidence-vault',
    'ettercap',
    'reaver',
    'hydra',
    'msf',
  ],
  AnalyzerSkeleton,
);

registerSkeleton(['autopsy'], AutopsySkeleton);
registerSkeleton(['volatility'], VolatilitySkeleton);
registerSkeleton(['wireshark'], WiresharkSkeleton);
registerSkeleton(['project-gallery', 'alex'], ProjectGallerySkeleton);

registerSkeleton(
  [
    '2048',
    'blackjack',
    'breakout',
    'sokoban',
    'checkers',
    'chess',
    'connect-four',
    'connect_four',
    'tictactoe',
    'frogger',
    'flappy-bird',
    'snake',
    'memory',
    'minesweeper',
    'pong',
    'pacman',
    'car-racer',
    'lane-runner',
    'platformer',
    'battleship',
    'reversi',
    'simon',
    'solitaire',
    'solitaire/index',
    'tower-defense',
    'tower_defense',
    'pinball',
    'asteroids',
    'sudoku',
    'space-invaders',
    'space_invaders',
    'nonogram',
    'tetris',
    'candy-crush',
    'candy_crush',
    'gomoku',
    'phaser_matter',
    'phaser-matter',
    'wordle',
    'hangman',
    'lane_runner',
    'spaceinvaders',
  ],
  GameSkeleton,
);

registerSkeleton(['word-search', 'word_search'], WordSearchSkeleton);

registerSkeleton(
  [
    'contact',
    'converter',
    'figlet',
    'http',
    'input-lab',
    'password_generator',
    'password-generator',
    'qr',
    'calculator',
    'ascii_art',
    'ascii-art',
    'quote',
    'ssh',
    'html-rewriter',
  ],
  FormSkeleton,
);

registerSkeleton(['weather'], WeatherSkeleton);
registerSkeleton(['weather_widget', 'weather-widget', 'timer_stopwatch', 'timer-stopwatch', 'ble-sensor', 'ble_sensor'], WidgetSkeleton);
registerSkeleton(['sticky_notes', 'sticky-notes'], StickyNotesSkeleton);
registerSkeleton(['settings'], SettingsSkeleton);

export const getAppSkeleton = (id: string, title?: string) => {
  const key = normalizeAppId(id);
  const renderer = skeletons[key];
  if (renderer) {
    return renderer();
  }
  return DefaultSkeleton(title ?? key);
};
