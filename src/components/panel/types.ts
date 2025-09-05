export interface PanelPlugin {
  id: string;
  settings?: Record<string, unknown>;
}

export interface PanelLayout {
  position: 'top' | 'bottom';
  size: number;
  plugins: PanelPlugin[];
}

export const DEFAULT_PANEL_LAYOUT: PanelLayout = {
  position: 'bottom',
  size: 40,
  plugins: [],
};

export const PANEL_LAYOUT_KEY = '~/.config/xfce4/panel.json';
