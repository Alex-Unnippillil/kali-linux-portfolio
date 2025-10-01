import { computeImportRisk } from '../../../../components/apps/reconng/utils/importRisk';

describe('computeImportRisk', () => {
  it('returns low risk for small JSON files', () => {
    const file = new File(['{}'], 'templates.json', { type: 'application/json' });
    const result = computeImportRisk(file);
    expect(result.level).toBe('low');
  });

  it('flags high risk for large files', () => {
    const file = new File([new Array(600 * 1024).join('a')], 'templates.json', {
      type: 'application/json',
    });
    const result = computeImportRisk(file);
    expect(result.level).toBe('high');
  });

  it('flags high risk for executable extensions', () => {
    const file = new File(['{}'], 'dangerous.exe', { type: 'application/octet-stream' });
    const result = computeImportRisk(file);
    expect(result.level).toBe('high');
  });
});
