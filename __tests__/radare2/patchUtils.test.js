import { buildRadare2PatchScript } from '../../components/apps/radare2/patchUtils';

describe('buildRadare2PatchScript', () => {
  test('returns header only for empty patches', () => {
    const script = buildRadare2PatchScript([], '0x401000');

    expect(script).toContain('# radare2 patch script (generated)');
    expect(script).toContain('# base: 0x401000');
    expect(script).toContain('# patches: 0');
    expect(script).not.toContain('wx ');
  });

  test('emits single patch with one seek and one write', () => {
    const script = buildRadare2PatchScript(
      [{ offset: 0x2a, value: '90' }],
      '0x401000',
    );

    expect(script).toContain('s 0x40102a');
    expect(script).toContain('wx 90');
  });

  test('groups contiguous patches into one run', () => {
    const script = buildRadare2PatchScript(
      [
        { offset: 0x10, value: '90' },
        { offset: 0x11, value: '90' },
        { offset: 0x12, value: 'c3' },
      ],
      '0x401000',
    );

    expect(script).toContain('s 0x401010');
    expect(script).toContain('wx 9090c3');
    expect(script.match(/^s\s+/gm)).toHaveLength(1);
  });

  test('splits non-contiguous patches into multiple runs', () => {
    const script = buildRadare2PatchScript(
      [
        { offset: 0x10, value: '90' },
        { offset: 0x12, value: 'c3' },
      ],
      '0x401000',
    );

    expect(script).toContain('s 0x401010');
    expect(script).toContain('wx 90');
    expect(script).toContain('s 0x401012');
    expect(script).toContain('wx c3');
    expect(script.match(/^s\s+/gm)).toHaveLength(2);
  });

  test('sorts unsorted input deterministically', () => {
    const script = buildRadare2PatchScript(
      [
        { offset: 0x30, value: 'c3' },
        { offset: 0x2f, value: '90' },
      ],
      '0x401000',
    );

    expect(script).toContain('s 0x40102f');
    expect(script).toContain('wx 90c3');
    expect(script.indexOf('s 0x40102f')).toBeLessThan(script.indexOf('wx 90c3'));
  });
});
