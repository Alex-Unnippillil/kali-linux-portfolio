import usePersistentState from './usePersistentState';

export interface PanelSettings {
  size: number; // height in px
  mode: 'bottom' | 'top';
  autohide: boolean;
  background: string; // hex with alpha
}

export const defaultPanelSettings: PanelSettings = {
  size: 40,
  mode: 'bottom',
  autohide: false,
  background: '#00000080',
};

function isPanelSettings(value: unknown): value is PanelSettings {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as any;
  return (
    typeof v.size === 'number' &&
    (v.mode === 'bottom' || v.mode === 'top') &&
    typeof v.autohide === 'boolean' &&
    typeof v.background === 'string'
  );
}

export default function usePanelSettings() {
  return usePersistentState<PanelSettings>(
    'app:panel-settings',
    defaultPanelSettings,
    isPanelSettings,
  );
}
