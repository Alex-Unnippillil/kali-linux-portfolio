export interface KVAdapter {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
}

class MemoryKV implements KVAdapter {
  private store = new Map<string, string>();

  async get<T>(key: string): Promise<T | null> {
    const val = this.store.get(key);
    return val ? (JSON.parse(val) as T) : null;
    }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }
}

class RedisKV implements KVAdapter {
  constructor(_url: string) {}
  async get<T>(_key: string): Promise<T | null> {
    throw new Error('RedisKV not implemented');
  }
  async set<T>(_key: string, _value: T): Promise<void> {
    throw new Error('RedisKV not implemented');
  }
}

class S3KV implements KVAdapter {
  constructor(_bucket: string) {}
  async get<T>(_key: string): Promise<T | null> {
    throw new Error('S3KV not implemented');
  }
  async set<T>(_key: string, _value: T): Promise<void> {
    throw new Error('S3KV not implemented');
  }
}

export let kv: KVAdapter = (() => {
  if (process.env.REDIS_URL) {
    return new RedisKV(process.env.REDIS_URL);
  }
  if (process.env.S3_BUCKET) {
    return new S3KV(process.env.S3_BUCKET);
  }
  return new MemoryKV();
})();

export function setKVAdapter(adapter: KVAdapter) {
  kv = adapter;
}

export { MemoryKV, RedisKV, S3KV };
