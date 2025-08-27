import usePersistentState from './usePersistentState';

export interface GameSettings {
  difficulty: 'easy' | 'medium' | 'hard';
  assist: boolean;
  quality: number;
  highContrast: boolean;
  showSettings: boolean;
}

const defaultSettings: GameSettings = {
  difficulty: 'easy',
  assist: false,
  quality: 1,
  highContrast: false,
  showSettings: false,
};

/**
 * Persisted game settings including difficulty, assists and visual options.
 * Uses `usePersistentState` under the hood.
 */
export function useGameSettings(key: string) {
  const [settings, setSettings] = usePersistentState<GameSettings>(
    `game-settings-${key}`,
    defaultSettings,
  );

  const update = (partial: Partial<GameSettings>) =>
    setSettings({ ...settings, ...partial });

  return { settings, update } as const;
}

export default useGameSettings;
