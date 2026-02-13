import {
  SerialExportSession,
  parseSerialExport,
  parseSerialJson,
  replaySerialExport,
} from '../services/serial/export';

describe('Serial export pipeline', () => {
  it('captures frames and exports JSON with metadata', () => {
    const session = new SerialExportSession({ meta: { source: 'test-suite' } });
    session.record('hello', { meta: { direction: 'out', note: 'greeting' } });
    session.record('world', { meta: { direction: 'in' } });

    const json = session.toJSON(true);
    const envelope = parseSerialJson(json);

    expect(envelope.header.format).toBe('serial-export');
    expect(envelope.header.meta).toEqual({ source: 'test-suite' });
    expect(envelope.frames).toHaveLength(2);
    expect(envelope.frames[0].meta.direction).toBe('out');
    expect(envelope.frames[0].meta.note).toBe('greeting');
    expect(envelope.frames[1].meta.direction).toBe('in');
    expect(envelope.frames[0].byteLength).toBeGreaterThan(0);
  });

  it('streams large sessions without exceeding chunk size', async () => {
    const session = new SerialExportSession();
    for (let i = 0; i < 200; i += 1) {
      session.record(`frame-${i}`);
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of session.jsonChunks({ chunkSize: 64 })) {
      chunks.push(chunk);
      expect(chunk.length).toBeLessThanOrEqual(64);
    }
    const decoder = new TextDecoder();
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    const streamed = decoder.decode(merged);
    const streamedEnvelope = parseSerialJson(streamed);
    const fullEnvelope = parseSerialJson(session.toJSON());
    expect(streamedEnvelope.frames).toEqual(fullEnvelope.frames);
    expect(streamedEnvelope.header.frameCount).toBe(fullEnvelope.header.frameCount);
    expect(streamedEnvelope.header.format).toBe('serial-export');
  });

  it('round trips via PCAP and replays frames', async () => {
    const session = new SerialExportSession();
    session.record('alpha', { meta: { direction: 'out', label: 'a' } });
    session.record('beta', { meta: { direction: 'in', label: 'b' } });

    const pcap = await session.toUint8Array('pcap');
    const envelope = await parseSerialExport(pcap.buffer);
    expect(envelope.frames).toHaveLength(2);
    expect(envelope.frames[0].data).toBe('alpha');
    expect(envelope.frames[1].meta.label).toBe('b');

    let replayed = '';
    await replaySerialExport(envelope, (frame) => {
      replayed += frame.data;
    }, { realtime: false });
    expect(replayed).toBe('alphabeta');
  });
});
