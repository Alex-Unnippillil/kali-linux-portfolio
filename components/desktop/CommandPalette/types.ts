export type CommandPaletteActionHandler = () => void | Promise<void>;

export interface CommandPaletteAction {
  /**
   * Unique identifier for the action. Used for deduping and persistence keys.
   */
  id: string;
  /**
   * Display label that appears in the palette search results.
   */
  label: string;
  /**
   * Handler invoked when the action is selected.
   */
  handler: CommandPaletteActionHandler;
  /**
   * Optional application scope so palette consumers can filter actions.
   */
  appId?: string;
}

export interface CommandPaletteStoredAction extends CommandPaletteAction {
  /** Timestamp representing when the action was registered. */
  registeredAt: number;
  /** Timestamp of the most recent invocation for ranking. */
  lastInvoked?: number;
}
