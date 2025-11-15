export interface ParsedLog {
  timestamp: string;
  marker: string;
  message: string;
}

const timestampRegex = /^(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})/;
const markerRegex = /\b(INFO|WARN|ERROR|DEBUG)\b/;

export function parseLogs(text: string): ParsedLog[] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const timestampMatch = line.match(timestampRegex);
      const markerMatch = line.match(markerRegex);
      const timestamp = timestampMatch ? timestampMatch[1] : '';
      const marker = markerMatch ? markerMatch[1] : '';
      const message = line
        .replace(timestampRegex, '')
        .replace(markerRegex, '')
        .trim();
      return { timestamp, marker, message };
    });
}

const ipRegex = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;
const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

export function redactLine(line: string): string {
  return line.replace(ipRegex, '[REDACTED]').replace(emailRegex, '[REDACTED]');
}
