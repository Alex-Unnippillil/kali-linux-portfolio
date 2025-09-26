export function createErrorResponse(message, options = {}) {
  const payload = { error: message };
  if (typeof options.retryAfter === 'number' && Number.isFinite(options.retryAfter)) {
    payload.retryAfter = options.retryAfter;
  }
  return payload;
}

export default createErrorResponse;
