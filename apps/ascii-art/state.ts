import usePersistentState from '../../hooks/usePersistentState';

export interface AsciiArtPreset {
  text: string;
  font: string;
  brightness: number;
  contrast: number;
}

export function useAsciiArtState() {
  const [presets, setPresets] = usePersistentState<Record<string, AsciiArtPreset>>(
    'ascii-art-presets',
    {}
  );
  const [activePreset, setActivePreset] = usePersistentState<string | null>(
    'ascii-art-active-preset',
    null
  );

  const savePreset = (name: string, preset: AsciiArtPreset) => {
    setPresets({ ...presets, [name]: preset });
    setActivePreset(name);
  };

  const loadPreset = (name: string) => {
    const preset = presets[name];
    if (preset) setActivePreset(name);
    return preset;
  };

  return { presets, savePreset, loadPreset, activePreset };
}
