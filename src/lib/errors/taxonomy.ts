export const errorMessages: Record<string, string> = {
  rate_limit: 'Too many requests. Please try again later.',
  invalid_input: 'Please check your input and try again.',
  invalid_csrf: 'Security token mismatch. Refresh and retry.',
  invalid_recaptcha: 'Captcha verification failed. Please try again.',
  recaptcha_disabled:
    'Captcha service is not configured. Please use the options above.',
};

export function getErrorMessage(code?: string): string {
  return (code && errorMessages[code]) || 'Submission failed';
}

export default errorMessages;
