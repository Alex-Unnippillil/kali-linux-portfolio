import {
  MAX_QR_PAYLOAD_LENGTH,
  parseBatchCsv,
  validateQrText,
} from '../utils/qrValidation';

describe('QR validation helpers', () => {
  it('validates non-empty payloads', () => {
    const result = validateQrText('hello world');
    expect(result.ok).toBe(true);
    expect(result.sanitized).toBe('hello world');
  });

  it('rejects empty or whitespace payloads', () => {
    const result = validateQrText('   ');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Enter text to encode.');
  });

  it('rejects payloads longer than the maximum', () => {
    const input = 'x'.repeat(MAX_QR_PAYLOAD_LENGTH + 1);
    const result = validateQrText(input);
    expect(result.ok).toBe(false);
    expect(result?.error).toContain(`${MAX_QR_PAYLOAD_LENGTH}`);
  });

  it('parses CSV batches with errors', () => {
    const csv = ['good,first', ',', 'bad'].join('\n');
    const { items, errors } = parseBatchCsv(csv);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ name: 'first', value: 'good' });
    expect(items[1]).toMatchObject({ name: 'code-3', value: 'bad' });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Line 2');
  });
});
