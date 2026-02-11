import React from 'react';
import { PALETTES } from './constants';
import type { MatchMode, StatsState, Token } from './types';

type Props = {
  mode: 'cpu' | 'local';
  setMode: (v: 'cpu' | 'local') => void;
  matchMode: MatchMode;
  handleMatchModeChange: (v: MatchMode) => void;
  difficulty: 'easy' | 'normal' | 'hard';
  setDifficulty: (d: 'easy' | 'normal' | 'hard') => void;
  assists: boolean;
  setAssists: (v: boolean) => void;
  palette: keyof typeof PALETTES;
  setPalette: (v: keyof typeof PALETTES) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  quality: number;
  setQuality: (v: number) => void;
  confirmMove: boolean;
  setConfirmMove: (v: boolean) => void;
  showPatterns: boolean;
  setShowPatterns: (v: boolean) => void;
  humanToken: Token;
  setHumanToken: (t: Token) => void;
  humanStarts: boolean;
  setHumanStarts: (v: boolean) => void;
  tokenNames: Record<Token, string>;
  stats: StatsState;
  hardReset: () => void;
  matchModeSingle: boolean;
  resetMatch: () => void;
};

export default function SettingsPanel(props: Props) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400">Mode</div>
        <div className="mt-2 flex gap-2">
          <button type="button" className={`px-3 py-1 rounded border ${props.mode === 'cpu' ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'}`} onClick={() => props.setMode('cpu')}>vs CPU</button>
          <button type="button" className={`px-3 py-1 rounded border ${props.mode === 'local' ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'}`} onClick={() => props.setMode('local')}>2 Players</button>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400">Match</div>
        <div className="mt-2 flex gap-2">
          <button type="button" className={`px-3 py-1 rounded border ${props.matchMode === 'single' ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'}`} onClick={() => props.handleMatchModeChange('single')}>Single</button>
          <button type="button" className={`px-3 py-1 rounded border ${props.matchMode === 'best_of_3' ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'}`} onClick={() => props.handleMatchModeChange('best_of_3')}>Best of 3</button>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400">Difficulty</div>
        <div className="mt-2 flex gap-2">{(['easy', 'normal', 'hard'] as const).map((d) => <button key={d} type="button" className={`px-3 py-1 rounded border ${props.difficulty === d ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'}`} onClick={() => props.setDifficulty(d)}>{d}</button>)}</div>
      </div>
      <div className="flex items-center gap-2"><button type="button" className={`px-3 py-1 rounded border ${props.assists ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'}`} onClick={() => props.setAssists(!props.assists)}>Assists {props.assists ? 'On' : 'Off'}</button></div>
      <div className="flex flex-wrap gap-2">{(Object.keys(PALETTES) as Array<keyof typeof PALETTES>).map((name) => <button key={name} type="button" className={`px-3 py-1 rounded border ${props.palette === name ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'}`} onClick={() => props.setPalette(name)}>{PALETTES[name].label}</button>)}</div>
      <div className="flex gap-2"><button type="button" className={`px-3 py-1 rounded border ${props.highContrast ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'}`} onClick={() => props.setHighContrast(!props.highContrast)}>Contrast {props.highContrast ? 'High' : 'Std'}</button><button type="button" className={`px-3 py-1 rounded border ${props.confirmMove ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'}`} onClick={() => props.setConfirmMove(!props.confirmMove)}>Confirm {props.confirmMove ? 'On' : 'Off'}</button><button type="button" className={`px-3 py-1 rounded border ${props.showPatterns ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'}`} onClick={() => props.setShowPatterns(!props.showPatterns)}>Patterns {props.showPatterns ? 'On' : 'Off'}</button></div>
      <div className="mt-2 flex gap-2">{[0, 1, 2].map((val) => <button key={val} type="button" className={`px-3 py-1 rounded border ${props.quality === val ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'}`} onClick={() => props.setQuality(val)}>{val === 0 ? 'Low' : val === 1 ? 'Standard' : 'High'}</button>)}</div>
      {props.mode === 'cpu' && <div className="space-y-2"><div className="flex gap-2">{(['red', 'yellow'] as const).map((t) => <button key={t} type="button" className={`px-3 py-1 rounded border ${props.humanToken === t ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'}`} onClick={() => props.setHumanToken(t)}>{props.tokenNames[t]}</button>)}</div><div className="flex gap-2"><button type="button" className={`px-3 py-1 rounded border ${props.humanStarts ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'}`} onClick={() => props.setHumanStarts(true)}>You first</button><button type="button" className={`px-3 py-1 rounded border ${!props.humanStarts ? 'border-gray-200 text-white' : 'border-gray-600 text-gray-300'}`} onClick={() => props.setHumanStarts(false)}>CPU first</button></div></div>}
      <div className="rounded border border-gray-700/60 p-3 text-xs text-gray-400"><div className="font-semibold text-gray-200">Stats</div>{props.mode === 'cpu' ? <div className="mt-2">{props.stats.cpu[props.difficulty].wins}W / {props.stats.cpu[props.difficulty].losses}L / {props.stats.cpu[props.difficulty].draws}D</div> : <div className="mt-2">{props.tokenNames.red}: {props.stats.local.redWins} | {props.tokenNames.yellow}: {props.stats.local.yellowWins}</div>}</div>
      <div className="pt-2 border-t border-gray-700 space-y-2"><button type="button" className="px-3 py-1 rounded border border-gray-600" onClick={props.hardReset}>New Game</button>{!props.matchModeSingle && <button type="button" className="px-3 py-1 rounded border border-gray-600" onClick={props.resetMatch}>New Match</button>}</div>
    </div>
  );
}
