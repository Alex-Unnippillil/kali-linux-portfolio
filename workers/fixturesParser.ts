import { registerWorkerHandler } from './pool/messages';

export interface FixturesParserRequest {
  text: string;
}

export interface FixturesParserProgress {
  percent: number;
}

export interface FixturesParserResult {
  rows: any[];
}

registerWorkerHandler<FixturesParserRequest, FixturesParserResult, FixturesParserProgress>(
  async ({ text }, context) => {
    const lines = text.split(/\n/);
    const total = lines.length || 1;
    const result: any[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (context.isCancelled()) {
        throw new DOMException('cancelled', 'AbortError');
      }
      const line = lines[i].trim();
      if (!line) continue;
      try {
        result.push(JSON.parse(line));
      } catch {
        result.push({ line });
      }
      if (i % 100 === 0) {
        const percent = Math.round((i / total) * 100);
        context.reportProgress({ percent });
      }
    }

    context.reportProgress({ percent: 100 });
    return { rows: result };
  },
);
