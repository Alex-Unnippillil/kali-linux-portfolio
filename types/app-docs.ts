export interface AppDocConfig {
  /**
   * Title displayed in the documentation sidecar header.
   */
  title: string;
  /**
   * Optional teaser copy that appears under the title.
   */
  summary?: string;
  /**
   * Relative path (from the repository root) to the source file inside `docs/`.
   */
  source: string;
  /**
   * Identifier used by the API route. Defaults to the app id when omitted.
   */
  docId?: string;
  /**
   * Whether the panel should start open on wide layouts for first-time visitors.
   */
  defaultOpen?: boolean;
}
