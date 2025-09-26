import 'idb/build/entry';

declare module 'idb/build/entry' {
  interface TypedDOMStringList<T extends string> extends DOMStringList {
    [Symbol.iterator](): ArrayIterator<T>;
  }
}
