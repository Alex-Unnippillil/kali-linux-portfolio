import type { SVGProps } from "react";

export interface PanelProfile {
  id: string;
  name: string;
  description: string;
  Preview: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  settings: {
    orientation: "horizontal" | "vertical";
    length: number;
    size: number;
    autohide: boolean;
  };
}

const bar = "var(--color-muted)";

export const PANEL_PROFILES: readonly PanelProfile[] = [
  {
    id: "default",
    name: "Default",
    description: "Top panel with full width.",
    Preview: (props) => (
      <svg viewBox="0 0 100 50" {...props}>
        <rect x="0" y="0" width="100" height="10" fill={bar} />
      </svg>
    ),
    settings: { orientation: "horizontal", length: 100, size: 24, autohide: false },
  },
  {
    id: "bottom",
    name: "Bottom Dock",
    description: "Bottom panel that autohides.",
    Preview: (props) => (
      <svg viewBox="0 0 100 50" {...props}>
        <rect x="0" y="40" width="100" height="10" fill={bar} />
      </svg>
    ),
    settings: { orientation: "horizontal", length: 100, size: 32, autohide: true },
  },
  {
    id: "vertical",
    name: "Vertical",
    description: "Left side vertical panel.",
    Preview: (props) => (
      <svg viewBox="0 0 100 50" {...props}>
        <rect x="0" y="0" width="10" height="50" fill={bar} />
      </svg>
    ),
    settings: { orientation: "vertical", length: 100, size: 24, autohide: false },
  },
];

