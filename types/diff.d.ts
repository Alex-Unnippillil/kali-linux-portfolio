// Minimal type declarations for the `diff` library
declare module 'diff' {
  /**
   * Represents a difference between two pieces of text.
   */
  export interface Change {
    /** Portion of text that was changed. */
    value: string;
    /** True if this portion was added in the new text. */
    added?: boolean;
    /** True if this portion was removed from the old text. */
    removed?: boolean;
    /** Number of lines this change represents. */
    count?: number;
  }

  /**
   * Compute a line-by-line diff between two strings.
   */
  export function diffLines(oldStr: string, newStr: string): Change[];
}

