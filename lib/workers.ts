import * as Comlink from 'comlink';

export const createPcapWorker = () =>
  Comlink.wrap<any>(new Worker(new URL('../workers/pcap.worker.ts', import.meta.url), { type: 'module' }));

export const createYaraWorker = () =>
  Comlink.wrap<any>(new Worker(new URL('../workers/yara.worker.ts', import.meta.url), { type: 'module' }));

export const createSqliteWorker = () =>
  Comlink.wrap<any>(new Worker(new URL('../workers/sqlite.worker.ts', import.meta.url), { type: 'module' }));

export const createKeyWorker = () =>
  Comlink.wrap<any>(new Worker(new URL('../workers/key.worker.ts', import.meta.url), { type: 'module' }));

export const createCvssWorker = () =>
  Comlink.wrap<any>(new Worker(new URL('../workers/cvss.worker.ts', import.meta.url), { type: 'module' }));
