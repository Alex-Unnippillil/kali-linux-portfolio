import { PRESETS } from '@components/apps/regex-redactor/presets';

const getPattern = (label: string): string => {
  const preset = PRESETS.find((p) => p.label === label);
  if (!preset) throw new Error(`Preset ${label} not found`);
  return preset.pattern;
};

const highlightMatches = async (pattern: string, text: string) => {
  const { RE2 } = await import('re2-wasm');
  const regex = new RE2(pattern, 'gu');
  const highlights: Array<{ start: number; end: number }> = [];
  text.replace(regex, (match: string, offset: number) => {
    highlights.push({ start: offset, end: offset + match.length });
    return match;
  });
  return highlights;
};

describe('regex-redactor RE2 patterns', () => {
  test('email pattern highlights address', async () => {
    const text = 'Reach me at user.name@example.com for details.';
    const pattern = getPattern('Email');
    const highlights = await highlightMatches(pattern, text);
    const match = 'user.name@example.com';
    const start = text.indexOf(match);
    expect(highlights).toEqual([{ start, end: start + match.length }]);
  });

  test('phone pattern highlights number', async () => {
    const text = 'Call +1 234-567-8901 soon.';
    const pattern = getPattern('Phone');
    const highlights = await highlightMatches(pattern, text);
    const match = '+1 234-567-8901';
    const start = text.indexOf(match);
    expect(highlights).toEqual([{ start, end: start + match.length }]);
  });

  test('IP pattern highlights addresses', async () => {
    const text =
      'Hosts 192.168.0.1 and 2001:0db8:85a3:0000:0000:8a2e:0370:7334 are reachable.';
    const pattern = getPattern('IP');
    const highlights = await highlightMatches(pattern, text);
    const ipv4 = '192.168.0.1';
    const ipv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
    const start4 = text.indexOf(ipv4);
    const start6 = text.indexOf(ipv6);
    expect(highlights).toEqual([
      { start: start4, end: start4 + ipv4.length },
      { start: start6, end: start6 + ipv6.length },
    ]);
  });
});

