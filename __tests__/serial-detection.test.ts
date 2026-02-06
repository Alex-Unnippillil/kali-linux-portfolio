import {
  analyzeXonXoff,
  createXonSuggestion,
  detectEncoding,
  evaluateHardwareSignals,
  type HardwareSignals,
  type XonXoffStats,
} from '../utils/serial/detection';

describe('serial detection heuristics', () => {
  it('detects UTF-8 text with multi-byte sequences', () => {
    const bytes = new TextEncoder().encode('Hello π and café');
    const suggestion = detectEncoding(bytes);
    expect(suggestion.encoding).toBe('utf-8');
    expect(suggestion.confidence).toBeGreaterThan(0.6);
  });

  it('falls back to Latin-1 when invalid UTF-8 bytes are encountered', () => {
    const bytes = Uint8Array.from([0xff, 0xfe, 0xf1]);
    const suggestion = detectEncoding(bytes);
    expect(suggestion.encoding).toBe('latin1');
    expect(suggestion.confidence).toBeGreaterThan(0.6);
  });

  it('recommends Latin-1 when high-bit bytes lack UTF-8 structure', () => {
    const latin1Buffer = Uint8Array.from(Buffer.from('\xff\xfa\xf1', 'binary'));
    const suggestion = detectEncoding(latin1Buffer);
    expect(suggestion.encoding).toBe('latin1');
  });

  it('counts XON/XOFF bytes and toggles recommendation', () => {
    const sample = Uint8Array.from([0x11, 0x13, 0x41, 0x11]);
    const stats = analyzeXonXoff(sample);
    const aggregated: XonXoffStats = {
      xon: stats.xon,
      xoff: stats.xoff,
      totalBytes: sample.length,
    };
    const suggestion = createXonSuggestion(aggregated);
    expect(suggestion.type).toBe('XON/XOFF');
    expect(suggestion.state).toBe('enabled');
    expect(suggestion.confidence).toBeGreaterThan(0.6);
  });

  it('keeps software flow control disabled when no markers seen', () => {
    const aggregated: XonXoffStats = { xon: 0, xoff: 0, totalBytes: 400 };
    const suggestion = createXonSuggestion(aggregated);
    expect(suggestion.state).toBe('disabled');
  });

  it('mirrors available hardware signal telemetry', () => {
    const signals: HardwareSignals = { clearToSend: true, requestToSend: false };
    const results = evaluateHardwareSignals(signals);
    const cts = results.find((item) => item.type === 'CTS');
    const rts = results.find((item) => item.type === 'RTS');
    expect(cts?.state).toBe('enabled');
    expect(rts?.state).toBe('disabled');
  });
});
