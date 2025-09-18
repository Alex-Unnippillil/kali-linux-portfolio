import { transfer } from 'comlink';
import type { ParsedPacket, PcapWorkerApi, WifiAnalysisResult } from '../types/pcap';
import { createWorker } from './createWorker';
import { analyzeWifiCaptureFallback, parsePcapFallback } from './pcapFallback';

const workerHandle = createWorker<PcapWorkerApi>(
  () =>
    new Worker(new URL('../workers/pcap.worker.ts', import.meta.url), {
      type: 'module',
    }),
);

export const parsePcap = async (
  buffer: ArrayBuffer,
): Promise<ParsedPacket[]> => {
  const remote = workerHandle.worker();
  if (!remote) {
    return parsePcapFallback(buffer);
  }
  return remote.parsePcap(transfer(buffer, [buffer]));
};

export const analyzeWifiCapture = async (
  buffer: ArrayBuffer,
): Promise<WifiAnalysisResult> => {
  const remote = workerHandle.worker();
  if (!remote) {
    return analyzeWifiCaptureFallback(buffer);
  }
  return remote.analyzeWifiCapture(transfer(buffer, [buffer]));
};

export const releasePcapWorker = () => {
  workerHandle.terminate();
};

export default parsePcap;
