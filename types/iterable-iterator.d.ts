export {};

declare global {
  interface IterableIterator<T> {
    [Symbol.dispose]?(): void;
  }
}
