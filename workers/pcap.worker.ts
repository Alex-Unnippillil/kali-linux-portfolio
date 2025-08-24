import * as Comlink from 'comlink';

interface PcapSummary {
  packets: number;
  bytes: number;
}

async function parse(stream: ReadableStream<Uint8Array>): Promise<PcapSummary> {
  const reader = stream.getReader();
  let buffer = new Uint8Array(0);
  let packets = 0;
  let bytes = 0;
  let lastYield = performance.now();

  const readPacket = (): boolean => {
    if (buffer.length < 16) return false;
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const caplen = view.getUint32(8, true);
    const total = 16 + caplen;
    if (buffer.length < total) return false;
    buffer = buffer.subarray(total);
    packets++;
    return true;
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      const tmp = new Uint8Array(buffer.length + value.length);
      tmp.set(buffer);
      tmp.set(value, buffer.length);
      buffer = tmp;
      bytes += value.length;
      while (readPacket()) {
        if (performance.now() - lastYield > 40) {
          await new Promise((r) => setTimeout(r, 0));
          lastYield = performance.now();
        }
      }
    }
  }
  return { packets, bytes };
}

Comlink.expose({ parse });
