import * as Comlink from 'comlink';

// Define interfaces for each worker's exposed methods
export interface PcapWorker {
  // Example methods - replace with actual methods exposed by pcap.worker.ts
  parsePcap(file: ArrayBuffer): Promise<any>;
  getStats(): Promise<any>;
}

export interface YaraWorker {
  // Example methods - replace with actual methods exposed by yara.worker.ts
  scan(data: ArrayBuffer, rules: string): Promise<any>;
}

export interface SqliteWorker {
  // Example methods - replace with actual methods exposed by sqlite.worker.ts
  query(sql: string): Promise<any>;
  openDb(file: ArrayBuffer): Promise<void>;
}

export interface KeyWorker {
  // Example methods - replace with actual methods exposed by key.worker.ts
  generateKey(): Promise<string>;
  encrypt(data: string, key: string): Promise<string>;
}

export interface CvssWorker {
  // Example methods - replace with actual methods exposed by cvss.worker.ts
  calculate(scoreInput: any): Promise<number>;
}

export const createPcapWorker = () =>
  Comlink.wrap<PcapWorker>(new Worker(new URL('../workers/pcap.worker.ts', import.meta.url), { type: 'module' }));

export const createYaraWorker = () =>
  Comlink.wrap<YaraWorker>(new Worker(new URL('../workers/yara.worker.ts', import.meta.url), { type: 'module' }));

export const createSqliteWorker = () =>
  Comlink.wrap<SqliteWorker>(new Worker(new URL('../workers/sqlite.worker.ts', import.meta.url), { type: 'module' }));

export const createKeyWorker = () =>
  Comlink.wrap<KeyWorker>(new Worker(new URL('../workers/key.worker.ts', import.meta.url), { type: 'module' }));

export const createCvssWorker = () =>
  Comlink.wrap<CvssWorker>(new Worker(new URL('../workers/cvss.worker.ts', import.meta.url), { type: 'module' }));
