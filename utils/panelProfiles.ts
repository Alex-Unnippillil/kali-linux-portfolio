export interface PanelItem {
  plugin: string;
  config?: Record<string, unknown>;
}

export interface PanelProfile {
  size: number;
  length: number;
  orientation: "horizontal" | "vertical";
  autohide: boolean;
  items: PanelItem[];
}

export const PANEL_PROFILES: Record<string, PanelProfile> = {
  default: {
    size: 24,
    length: 100,
    orientation: "horizontal",
    autohide: false,
    items: [
      { plugin: "applications" },
      { plugin: "separator" },
      { plugin: "window-buttons" },
      { plugin: "separator" },
      { plugin: "notification-area" },
      { plugin: "clock" },
    ],
  },
  dev: {
    size: 28,
    length: 100,
    orientation: "horizontal",
    autohide: false,
    items: [
      { plugin: "applications" },
      { plugin: "separator" },
      { plugin: "terminal" },
      { plugin: "separator" },
      { plugin: "clock" },
    ],
  },
  minimal: {
    size: 24,
    length: 100,
    orientation: "horizontal",
    autohide: false,
    items: [
      { plugin: "applications" },
      { plugin: "clock" },
    ],
  },
};

export type PanelProfileName = keyof typeof PANEL_PROFILES;

