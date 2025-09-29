import { analyzeMask } from '../../apps/hashcat/components/MaskBuilder';

describe('analyzeMask', () => {
  it('parses valid masks and generates previews', () => {
    const result = analyzeMask('?l?u12', 5);

    expect(result.hasErrors).toBe(false);
    expect(result.candidateCount).toBe(BigInt(26 * 26));
    expect(result.preview).toHaveLength(5);
    expect(result.preview[0]).toBe('aA12');
    expect(result.preview[1]).toBe('aB12');
  });

  it('flags unknown tokens', () => {
    const result = analyzeMask('?z');

    expect(result.hasErrors).toBe(true);
    expect(result.errors[0]).toContain('Unknown token ?z');
    expect(result.parts[0].error).toContain('Unknown token');
  });

  it('flags dangling placeholders', () => {
    const result = analyzeMask('?');

    expect(result.hasErrors).toBe(true);
    expect(result.errors[0]).toContain('Dangling placeholder');
  });

  it('treats double question marks as literal characters', () => {
    const result = analyzeMask('??l');

    expect(result.hasErrors).toBe(false);
    expect(result.candidateCount).toBe(BigInt(1));
    expect(result.preview[0]).toBe('?l');
  });

  it('limits preview output', () => {
    const result = analyzeMask('?d?d?d', 12);

    expect(result.preview).toHaveLength(12);
    expect(result.preview[0]).toBe('000');
    expect(result.preview[11]).toBe('011');
  });
});
