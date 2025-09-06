export {};

/** Window sizing and behaviour options applied to each desktop app. */
export interface WindowProps {
  /** Whether the window can be resized by the user. */
  resizable?: boolean;
  /** Whether the window can be maximized. */
  allowMaximize?: boolean;
  /** Default width of the window as a percentage of the viewport. */
  defaultWidth?: number;
  /** Default height of the window as a percentage of the viewport. */
  defaultHeight?: number;
}

/** Metadata for an application entry in apps.config.js. */
export interface AppMetadata extends WindowProps {
  /** Unique identifier for the application. */
  id: string;
  /** Display name shown to users. */
  title: string;
  /** Path or URL to the application's icon. */
  icon: string;
  /** Whether the application is disabled. */
  disabled: boolean;
  /** Whether the application is marked as a favourite. */
  favourite: boolean;
  /** Whether the application has a desktop shortcut. */
  desktop_shortcut: boolean;
  /** Function that renders the application's screen. */
  screen: () => JSX.Element;
}
