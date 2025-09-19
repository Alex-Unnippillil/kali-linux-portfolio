"use client";

export type SessionSnapshot = unknown;

type SnapshotProvider = () => SessionSnapshot;

const providers = new Map<string, SnapshotProvider>();

export function registerSessionProvider(
  id: string,
  provider: SnapshotProvider,
): () => void {
  if (!id) return () => {};
  providers.set(id, provider);
  return () => {
    const existing = providers.get(id);
    if (existing === provider) {
      providers.delete(id);
    }
  };
}

export function collectSessionSnapshot(
  id: string,
): SessionSnapshot | undefined {
  const provider = providers.get(id);
  if (!provider) return undefined;
  try {
    return provider();
  } catch {
    return undefined;
  }
}

export function clearSessionProviders() {
  providers.clear();
}

