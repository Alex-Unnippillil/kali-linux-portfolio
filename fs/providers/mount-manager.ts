import { MountableProvider } from './types';

export interface MountRecord {
  id: string;
  provider: MountableProvider;
  source?: unknown;
}

export class MountManager {
  private mounts = new Map<string, MountRecord>();

  mount(provider: MountableProvider, source?: unknown): MountRecord {
    const record: MountRecord = { id: provider.id, provider, source };
    this.mounts.set(provider.id, record);
    return record;
  }

  get(id: string): MountRecord | undefined {
    return this.mounts.get(id);
  }

  list(): MountRecord[] {
    return Array.from(this.mounts.values());
  }

  unmount(id: string): void {
    const record = this.mounts.get(id);
    if (record) {
      try {
        record.provider.unmount();
      } catch {
        // ignore provider cleanup failures
      }
      this.mounts.delete(id);
    }
  }

  reset(): void {
    for (const record of this.mounts.values()) {
      try {
        record.provider.unmount();
      } catch {
        // ignore cleanup failures
      }
    }
    this.mounts.clear();
  }
}

export default MountManager;
