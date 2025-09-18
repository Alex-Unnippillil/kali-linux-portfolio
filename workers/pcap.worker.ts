import { expose } from 'comlink';
import { analyzeWifiCapture, parsePcap } from './pcapParser';
import type { PcapWorkerApi } from '../types/pcap';

const api: PcapWorkerApi = {
  async parsePcap(buffer) {
    return parsePcap(buffer);
  },
  async analyzeWifiCapture(buffer) {
    return analyzeWifiCapture(buffer);
  },
};

expose(api);
