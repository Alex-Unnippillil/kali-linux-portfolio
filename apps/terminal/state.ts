import usePersistentState from '../../hooks/usePersistentState';

export const PROMPT_PRESETS = {
  Kali: '┌──(🦊 kali)\r\n└─❯ ',
  Simple: '$ ',
} as const;

export type PromptPreset = keyof typeof PROMPT_PRESETS;

const PROMPT_KEY = 'terminal:prompt';

export function usePromptPreset() {
  return usePersistentState<PromptPreset>(
    PROMPT_KEY,
    'Kali',
    (v): v is PromptPreset => v in PROMPT_PRESETS,
  );
}

export function loadPromptPreset(): PromptPreset {
  try {
    const stored = window.localStorage.getItem(PROMPT_KEY);
    if (stored && stored in PROMPT_PRESETS) {
      return stored as PromptPreset;
    }
  } catch {
    // ignore
  }
  return 'Kali';
}

