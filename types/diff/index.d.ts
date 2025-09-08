declare module 'diff' {
  export interface Change {
    added?: boolean;
    removed?: boolean;
    value: string;
    count?: number;
  }
  export function diffLines(oldStr: string, newStr: string): Change[];
  export function diffJson(oldObj: unknown, newObj: unknown): Change[];
}
