export type FlowControlState = 'enabled' | 'disabled';
export type SignalType = 'CTS' | 'RTS' | 'XON/XOFF';

export interface SignalSuggestion {
  type: SignalType;
  state: FlowControlState;
  confidence: number;
  reason: string;
}

export type EncodingOption = 'utf-8' | 'latin1';

export interface EncodingSuggestion {
  encoding: EncodingOption;
  confidence: number;
  reason: string;
}

export interface XonXoffStats {
  xon: number;
  xoff: number;
  totalBytes: number;
}

export interface HardwareSignals {
  clearToSend?: boolean;
  requestToSend?: boolean;
}

export function analyzeXonXoff(bytes: Uint8Array): XonXoffStats {
  let xon = 0;
  let xoff = 0;
  for (const value of bytes) {
    if (value === 0x11) xon += 1;
    if (value === 0x13) xoff += 1;
  }
  return {
    xon,
    xoff,
    totalBytes: bytes.length,
  };
}

export function createXonSuggestion(stats: XonXoffStats): SignalSuggestion {
  const totalControl = stats.xon + stats.xoff;
  if (stats.totalBytes === 0) {
    return {
      type: 'XON/XOFF',
      state: 'disabled',
      confidence: 0.4,
      reason: 'No bytes captured yet to analyse software flow control.',
    };
  }

  if (totalControl === 0) {
    const confidence = Math.max(0.4, 1 - Math.min(0.6, stats.totalBytes / 2048));
    return {
      type: 'XON/XOFF',
      state: 'disabled',
      confidence,
      reason: `Inspected ${stats.totalBytes} byte(s) with no XON/XOFF markers detected.`,
    };
  }

  const ratio = totalControl / stats.totalBytes;
  const confidence = Math.min(0.95, 0.6 + ratio * 2);
  return {
    type: 'XON/XOFF',
    state: 'enabled',
    confidence,
    reason: `Observed ${stats.xon} XON and ${stats.xoff} XOFF control character(s) within ${stats.totalBytes} byte(s).`,
  };
}

export function evaluateHardwareSignals(signals: HardwareSignals): SignalSuggestion[] {
  const suggestions: SignalSuggestion[] = [];
  if (typeof signals.clearToSend === 'boolean') {
    suggestions.push({
      type: 'CTS',
      state: signals.clearToSend ? 'enabled' : 'disabled',
      confidence: signals.clearToSend ? 0.9 : 0.6,
      reason: signals.clearToSend
        ? 'Port reports clear-to-send high; hardware handshake is active.'
        : 'Port reports clear-to-send low; hardware handshake appears inactive.',
    });
  } else {
    suggestions.push({
      type: 'CTS',
      state: 'enabled',
      confidence: 0.4,
      reason: 'CTS state unavailable from port; keeping handshake enabled unless issues occur.',
    });
  }

  if (typeof signals.requestToSend === 'boolean') {
    suggestions.push({
      type: 'RTS',
      state: signals.requestToSend ? 'enabled' : 'disabled',
      confidence: 0.7,
      reason: signals.requestToSend
        ? 'Request-to-send output is asserted; peers likely expect RTS.'
        : 'Request-to-send output is low; RTS handshake may be unused.',
    });
  } else if (typeof signals.clearToSend === 'boolean') {
    suggestions.push({
      type: 'RTS',
      state: signals.clearToSend ? 'enabled' : 'disabled',
      confidence: 0.55,
      reason: 'Mirroring CTS reading because RTS state is unavailable.',
    });
  } else {
    suggestions.push({
      type: 'RTS',
      state: 'enabled',
      confidence: 0.4,
      reason: 'Signal telemetry missing; defaulting to RTS enabled.',
    });
  }

  return suggestions;
}

interface Utf8PatternStats {
  multiByteSequences: number;
  strayContinuation: number;
  highBytes: number;
}

function analyseUtf8Patterns(buffer: Uint8Array): Utf8PatternStats {
  let multiByteSequences = 0;
  let strayContinuation = 0;
  let highBytes = 0;

  for (let i = 0; i < buffer.length; i += 1) {
    const byte = buffer[i];
    if (byte >= 0x80) highBytes += 1;

    if (byte >> 5 === 0b110 && i + 1 < buffer.length && buffer[i + 1] >> 6 === 0b10) {
      multiByteSequences += 1;
      i += 1;
      continue;
    }
    if (byte >> 4 === 0b1110 && i + 2 < buffer.length && buffer[i + 1] >> 6 === 0b10 && buffer[i + 2] >> 6 === 0b10) {
      multiByteSequences += 1;
      i += 2;
      continue;
    }
    if (byte >> 3 === 0b11110 && i + 3 < buffer.length && buffer[i + 1] >> 6 === 0b10 && buffer[i + 2] >> 6 === 0b10 && buffer[i + 3] >> 6 === 0b10) {
      multiByteSequences += 1;
      i += 3;
      continue;
    }
    if (byte >> 6 === 0b10) {
      strayContinuation += 1;
      continue;
    }
    if (byte >= 0x80) {
      strayContinuation += 1;
    }
  }

  return { multiByteSequences, strayContinuation, highBytes };
}

export function detectEncoding(buffer: Uint8Array): EncodingSuggestion {
  if (buffer.length === 0) {
    return {
      encoding: 'utf-8',
      confidence: 0.5,
      reason: 'No input received; defaulting to UTF-8 until data arrives.',
    };
  }

  let utf8Valid = true;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    utf8Valid = false;
  }

  const { multiByteSequences, strayContinuation, highBytes } = analyseUtf8Patterns(buffer);

  if (!utf8Valid) {
    const ratio = highBytes / buffer.length;
    return {
      encoding: 'latin1',
      confidence: Math.min(0.95, 0.6 + ratio * 0.5),
      reason: 'Encountered invalid UTF-8 byte patterns; Latin-1 preserves raw high-bit values.',
    };
  }

  if (highBytes === 0) {
    return {
      encoding: 'utf-8',
      confidence: 0.6,
      reason: 'All bytes are ASCII; UTF-8 is safe for mixed-language streams.',
    };
  }

  if (multiByteSequences > strayContinuation) {
    const ratio = multiByteSequences / Math.max(1, highBytes);
    return {
      encoding: 'utf-8',
      confidence: Math.min(0.95, 0.65 + ratio * 0.3),
      reason: `Detected ${multiByteSequences} multi-byte UTF-8 sequence(s) without errors.`,
    };
  }

  if (strayContinuation > 0) {
    const ratio = strayContinuation / buffer.length;
    return {
      encoding: 'latin1',
      confidence: Math.min(0.9, 0.5 + ratio * 1.5),
      reason: `Observed ${strayContinuation} isolated high-bit byte(s); Latin-1 keeps them verbatim.`,
    };
  }

  return {
    encoding: 'latin1',
    confidence: 0.55,
    reason: 'High-bit bytes lacked UTF-8 continuation structure; falling back to Latin-1.',
  };
}
