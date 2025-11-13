const moduleCache = new Map<string, Promise<unknown>>();

export async function loadFND03<T>(key: string, loader: () => Promise<T>): Promise<T> {
  if (moduleCache.has(key)) {
    return moduleCache.get(key)! as Promise<T>;
  }

  if (typeof window === 'undefined') {
    const pending = Promise.reject<T>(
      new Error('FND-03 dynamic helper can only be used in the browser.')
    );
    // Avoid unhandled rejection warnings by attaching a noop catch.
    pending.catch(() => undefined);
    return pending;
  }

  const promise = loader().catch(error => {
    moduleCache.delete(key);
    throw error;
  });

  moduleCache.set(key, promise as Promise<unknown>);
  return promise;
}

export function clearFND03Cache(key?: string) {
  if (typeof key === 'string') {
    moduleCache.delete(key);
    return;
  }
  moduleCache.clear();
}
