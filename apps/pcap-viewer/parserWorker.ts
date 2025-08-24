// Web Worker for parsing pcap/pcapng files using WASM parser

const BATCH_SIZE = 200;

self.onmessage = async (e: MessageEvent) => {
  if (e.data.type === 'parse') {
    try {
      // @ts-ignore - generated at build time
      const mod = await import(/* webpackIgnore: true */ './pcap-wasm/pkg/pcap_wasm.js');
      await mod.default();
      const { packets, protocols, malformed } = mod.parse_pcap(new Uint8Array(e.data.buffer));
      (self as any).postMessage({ type: 'summary', protocols, malformed });
      for (let i = 0; i < packets.length; i += BATCH_SIZE) {
        const batch = packets.slice(i, i + BATCH_SIZE);
        (self as any).postMessage({ type: 'packet', packets: batch });
      }
      (self as any).postMessage({ type: 'done' });
    } catch (err: any) {
      (self as any).postMessage({ type: 'error', error: err.toString() });
    }
  }
};

export {};

