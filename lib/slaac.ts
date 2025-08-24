export interface SlaacEvent {
  time: string;
  type: string;
  line: string;
}

export interface SlaacResult {
  events: SlaacEvent[];
  eui64Addresses: string[];
}

function extractTime(line: string): string {
  const match = line.match(/(\d{2}:\d{2}:\d{2})/);
  return match ? match[1] : '';
}

export function parseSlaac(input: string): SlaacResult {
  const events: SlaacEvent[] = [];
  const eui64Addresses: string[] = [];
  const lines = input.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const time = extractTime(trimmed);
    if (/Router Advertisement/i.test(trimmed)) {
      events.push({ time, type: 'Router Advertisement', line: trimmed });
    } else if (/Neighbor Solicitation/i.test(trimmed)) {
      events.push({ time, type: 'Neighbor Solicitation', line: trimmed });
    } else if (/Neighbor Advertisement/i.test(trimmed)) {
      events.push({ time, type: 'Neighbor Advertisement', line: trimmed });
    } else if (/autoconfig/i.test(trimmed)) {
      events.push({ time, type: 'Autoconfig', line: trimmed });
    }

    const withoutTime = trimmed.replace(/\d{2}:\d{2}:\d{2}/, '');
    const addrMatch = withoutTime.match(/[0-9a-f]{1,4}:[0-9a-f:]+/i);
    if (addrMatch) {
      const addr = addrMatch[0];
      if (/ff:fe|fffe/i.test(addr)) {
        eui64Addresses.push(addr);
      }
    }
  }
  return { events, eui64Addresses };
}

export function hasPrivacyExtensions(result: SlaacResult): boolean {
  return result.eui64Addresses.length === 0;
}
