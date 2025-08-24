// Web Worker for parsing pcap/pcapng files using WASM parser

self.onmessage = async (e: MessageEvent) => {
  if (e.data.type === 'parse') {
    try {
      // @ts-ignore - generated at build time
      const mod = await import(/* webpackIgnore: true */ './pcap-wasm/pkg/pcap_wasm.js');
      await mod.default();
      const result = mod.parse_pcap(new Uint8Array(e.data.buffer));
      (self as any).postMessage({ type: 'result', result });
    } catch (err: any) {
      (self as any).postMessage({ type: 'error', error: err.toString() });
    }
  }
};

export {};

