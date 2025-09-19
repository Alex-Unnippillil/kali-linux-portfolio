import { stagePatch, applyPatches, exportPatches } from '@/components/apps/radare2/patchUtils';

describe('radare2 patch utilities', () => {
  test('stages and applies patches', () => {
    const base = ['00', '01', '02'];
    let patches = [];
    patches = stagePatch(base, patches, 1, 'ff');
    expect(patches).toEqual([{ offset: 1, original: '01', value: 'ff' }]);
    const bytes = applyPatches(base, patches);
    expect(bytes).toEqual(['00', 'ff', '02']);
    expect(exportPatches(patches)).toEqual([{ offset: 1, original: '01', value: 'ff' }]);
  });
});
