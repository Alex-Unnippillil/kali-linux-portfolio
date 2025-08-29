const errorMap: Record<string | number, string> = {
  rate_limit: 'Too many requests. Please try again later.',
  invalid_input: 'Please check your input and try again.',
  invalid_csrf: 'Security token mismatch. Refresh and retry.',
  invalid_recaptcha: 'Captcha verification failed. Please try again.',
  400: 'Bad request. Please check your input and try again.',
  401: 'Unauthorized. Verify the provided credentials.',
  403: 'Access denied. Contact site owner.',
  404: 'Service not found. Contact site owner.',
  413: 'Message too large. Please shorten your message.',
  422: 'Invalid data. Please review and try again.',
  429: 'Too many requests. Please wait and try again later.',
  500: 'Server error. Please try again later.',
  503: 'Email service unavailable. Try again later.',
  network_error: 'Network error. Check your connection and retry.',
};

export default errorMap;
