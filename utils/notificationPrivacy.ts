export const PRIVACY_PLACEHOLDER = '…';

const KEYWORD_SECRET_PATTERN = /(\b(?:pass(?:word|code)?|secret|token|key|pin|otp|code)\b\s*(?:[:=]\s*)?)([^\s,;]+)/gi;
const OTP_PATTERN = /\b\d{6}\b/g;
const LONG_HEX_PATTERN = /\b[a-f0-9]{12,}\b/gi;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const URL_QUERY_SECRET_PATTERN = /(https?:\/\/[^\s?#]+[?&](?:token|key|secret|code)=[^\s&#]+)/gi;
const SSH_KEY_PATTERN = /(ssh-(?:rsa|dss|ed25519|ecdsa)[^\s]*)/gi;

export const DEFAULT_REDACTION_MESSAGE = 'Content hidden — privacy mode enabled.';

export interface MaskOptions {
  /**
   * When false, full messages are replaced with the placeholder instead of selective redaction.
   */
  allowPreview?: boolean;
}

export const maskSensitiveContent = (
  input?: string | null,
  options: MaskOptions = { allowPreview: true },
): string | undefined => {
  if (input == null) return input ?? undefined;
  const allowPreview = options.allowPreview !== false;
  if (!allowPreview) {
    return PRIVACY_PLACEHOLDER;
  }
  let result = input;
  result = result.replace(KEYWORD_SECRET_PATTERN, (_match, prefix) => `${prefix}${PRIVACY_PLACEHOLDER}`);
  result = result.replace(URL_QUERY_SECRET_PATTERN, (_match) => PRIVACY_PLACEHOLDER);
  result = result.replace(SSH_KEY_PATTERN, () => PRIVACY_PLACEHOLDER);
  result = result.replace(LONG_HEX_PATTERN, () => PRIVACY_PLACEHOLDER);
  result = result.replace(OTP_PATTERN, () => PRIVACY_PLACEHOLDER);
  result = result.replace(EMAIL_PATTERN, () => PRIVACY_PLACEHOLDER);
  return result;
};

export interface SanitizableNotification {
  title?: string;
  body?: string;
}

export interface SanitizationOptions extends MaskOptions {
  redactTitle?: boolean;
}

export const sanitizeNotification = <T extends SanitizableNotification>(
  notification: T,
  options: SanitizationOptions = {},
): T => {
  const { allowPreview = true, redactTitle = true } = options;
  return {
    ...notification,
    title:
      redactTitle && notification.title !== undefined
        ? maskSensitiveContent(notification.title, { allowPreview })
        : notification.title,
    body:
      notification.body !== undefined
        ? maskSensitiveContent(notification.body, { allowPreview })
        : notification.body,
  };
};
