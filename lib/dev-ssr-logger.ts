if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
  const createProxy = (name: string) =>
    new Proxy(
      {},
      {
        get(_target, prop: string | symbol) {
          console.warn(`SSR ${name} accessed: ${String(prop)}`);
          return undefined;
        },
      }
    );

  // @ts-ignore - expose proxies for server-side debugging
  globalThis.window = createProxy('window');
  // @ts-ignore - expose proxies for server-side debugging
  globalThis.document = createProxy('document');
}
