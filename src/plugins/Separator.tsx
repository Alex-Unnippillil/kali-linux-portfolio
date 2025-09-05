import React from 'react';

export type SeparatorMode = 'line' | 'expand';

export interface SeparatorProps {
  /**
   * Determines the visual style of the separator.
   * - `line`: renders a thin divider line.
   * - `expand`: flex item that grows to push adjacent items apart.
   */
  mode?: SeparatorMode;
}

export interface SeparatorSettingsProps {
  mode: SeparatorMode;
  onChange: (mode: SeparatorMode) => void;
}

const Separator: React.FC<SeparatorProps> & {
  Settings?: React.FC<SeparatorSettingsProps>;
} = ({ mode = 'line' }) => {
  return mode === 'expand' ? (
    <div className="flex-grow" />
  ) : (
    <div className="mx-2 border-l border-current opacity-25" />
  );
};

const Settings: React.FC<SeparatorSettingsProps> = ({ mode, onChange }) => (
  <label className="block text-xs">
    Mode:
    <select
      className="ml-2 bg-black border border-gray-600 rounded px-1 py-0.5"
      value={mode}
      onChange={(e) => onChange(e.target.value as SeparatorMode)}
    >
      <option value="line">Line</option>
      <option value="expand">Expand</option>
    </select>
  </label>
);

Separator.Settings = Settings;

export default Separator;
export { Settings as SeparatorSettings };
