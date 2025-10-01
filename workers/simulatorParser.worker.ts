import { registerWorkerHandler } from './pool/messages';

export interface SimulatorParserRequest {
  text: string;
}

export interface ParsedLine {
  line: number;
  key: string;
  value: string;
  raw: string;
}

export interface SimulatorParserProgress {
  progress: number;
  eta: number;
}

export interface SimulatorParserResult {
  parsed: ParsedLine[];
}

registerWorkerHandler<SimulatorParserRequest, SimulatorParserResult, SimulatorParserProgress>(
  async ({ text }, context) => {
    const lines = text.split(/\r?\n/);
    const total = lines.length || 1;
    const start = Date.now();
    const parsed: ParsedLine[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (context.isCancelled()) {
        throw new DOMException('cancelled', 'AbortError');
      }
      const line = lines[i];
      const [key, ...rest] = line.split(':');
      parsed.push({
        line: i + 1,
        key: key.trim(),
        value: rest.join(':').trim(),
        raw: line,
      });
      if (i % 100 === 0) {
        const progress = (i + 1) / total;
        const elapsed = Date.now() - start;
        const eta = progress > 0 ? (elapsed * (1 - progress)) / progress : 0;
        context.reportProgress({ progress, eta });
      }
    }

    return { parsed };
  },
);
