import React from 'react';
import SpeedControls from '../../../../games/pacman/components/SpeedControls';

interface SettingsPanelProps {
  difficulty: string;
  setDifficulty: (value: string) => void;
  difficultyPresets: Record<string, { label: string }>;
  muted: boolean;
  setMuted: (value: boolean) => void;
  classicOnly: boolean;
  setClassicOnly: (value: boolean) => void;
  randomLevels: boolean;
  setRandomLevels: (value: boolean) => void;
  showEditor: boolean;
  setShowEditor: (value: boolean) => void;
  ghostSpeeds: { scatter: number; chase: number };
  setGhostSpeeds: React.Dispatch<React.SetStateAction<{ scatter: number; chase: number }>>;
  gameSpeed: number;
  setGameSpeed: React.Dispatch<React.SetStateAction<number>>;
  retroMode: boolean;
  setRetroMode: (value: boolean) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = (props) => (
  <div className="space-y-3 text-sm text-slate-100">
    <div>
      <label className="block text-xs uppercase tracking-wide text-slate-300">Difficulty</label>
      <select className="mt-1 w-full rounded bg-slate-800/80 px-2 py-1" value={props.difficulty} onChange={(e) => props.setDifficulty(e.target.value)}>
        {Object.entries(props.difficultyPresets).map(([key, value]) => (
          <option key={key} value={key}>{value.label}</option>
        ))}
      </select>
    </div>
    <button type="button" className="w-full rounded bg-slate-700 px-2 py-1" onClick={() => props.setMuted(!props.muted)}>Sound: {props.muted ? 'Muted' : 'On'}</button>
    <button type="button" className="w-full rounded bg-slate-700 px-2 py-1" onClick={() => props.setClassicOnly(!props.classicOnly)}>Classic only: {props.classicOnly ? 'Enabled' : 'Off'}</button>
    <button type="button" className="w-full rounded bg-slate-700 px-2 py-1" onClick={() => props.setRandomLevels(!props.randomLevels)}>Random levels: {props.randomLevels ? 'On' : 'Off'}</button>
    <button type="button" className="w-full rounded bg-slate-700 px-2 py-1" onClick={() => props.setRetroMode(!props.retroMode)}>Render mode: {props.retroMode ? 'Retro' : 'Clean'}</button>
    <SpeedControls
      ghostSpeeds={props.ghostSpeeds}
      setGhostSpeeds={props.setGhostSpeeds}
      gameSpeed={props.gameSpeed}
      setGameSpeed={props.setGameSpeed}
    />
    <button type="button" onClick={() => props.setShowEditor(!props.showEditor)} className="w-full rounded bg-slate-700 px-2 py-1">{props.showEditor ? 'Hide' : 'Show'} Maze Editor</button>
  </div>
);

export default SettingsPanel;
