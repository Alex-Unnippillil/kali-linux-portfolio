import { maskSensitiveContent, PRIVACY_PLACEHOLDER } from '../utils/notificationPrivacy';

describe('maskSensitiveContent', () => {
  it('redacts secrets after keywords', () => {
    const input = 'Password=superSecret token=abc1234567890';
    const result = maskSensitiveContent(input);
    expect(result).toContain(`Password=${PRIVACY_PLACEHOLDER}`);
    expect(result).toContain(`token=${PRIVACY_PLACEHOLDER}`);
  });

  it('replaces OTP codes and long hashes with ellipses', () => {
    const input = 'OTP 123456 and digest deadbeefdeadbeef';
    const result = maskSensitiveContent(input);
    expect(result).toBe('OTP … and digest …');
  });

  it('forces placeholder when previews disabled', () => {
    const input = 'Some personal message';
    const result = maskSensitiveContent(input, { allowPreview: false });
    expect(result).toBe(PRIVACY_PLACEHOLDER);
  });
});
