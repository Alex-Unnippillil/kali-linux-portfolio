// Web Worker for parsing pcap/pcapng files using WASM parser

const BATCH_SIZE = 200;

self.onmessage = async (e: MessageEvent) => {
  if (e.data.type === 'parse') {
    try {
      // @ts-ignore - generated at build time
      const mod = await import(/* webpackIgnore: true */ './pcap-wasm/pkg/pcap_wasm.js');
      await mod.default();
      const { packets, protocols, malformed } = mod.parse_pcap(new Uint8Array(e.data.buffer));

      // build flows and attempt HTTP reassembly
      const flowsMap = new Map();
      const decoder = new TextDecoder();

      const concatArrays = (arrs: Uint8Array[]) => {
        const len = arrs.reduce((n, a) => n + a.length, 0);
        const out = new Uint8Array(len);
        let offset = 0;
        for (const a of arrs) {
          out.set(a, offset);
          offset += a.length;
        }
        return out;
      };

      for (const p of packets) {
        const key = `${p.src}:${p.src_port}-${p.dst}:${p.dst_port}-${p.proto}`;
        const revKey = `${p.dst}:${p.dst_port}-${p.src}:${p.src_port}-${p.proto}`;
        const k = flowsMap.has(revKey) ? revKey : key;
        let flow = flowsMap.get(k);
        if (!flow) {
          flow = {
            src: p.src,
            dst: p.dst,
            src_port: p.src_port,
            dst_port: p.dst_port,
            proto: p.proto,
            packetIndices: [],
          };
          flowsMap.set(k, flow);
        }
        flow.packetIndices.push(p.index);
        if (p.proto === 'HTTP') {
          if (!flow._data) flow._data = [];
          flow._data.push(p.data);
        }
      }

      const flows: any[] = [];
      for (const flow of flowsMap.values()) {
        if (flow._data) {
          const text = decoder.decode(concatArrays(flow._data));
          flow.http = text
            .split(/\r\n\r\n/)
            .map((m: string) => m.trim())
            .filter((m: string) => m.length > 0);
          delete flow._data;
        }
        flows.push(flow);
      }

      (self as any).postMessage({ type: 'summary', protocols, malformed });
      (self as any).postMessage({ type: 'flows', flows });
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

