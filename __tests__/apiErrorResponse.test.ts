import createErrorResponse from '../utils/apiErrorResponse';

describe('createErrorResponse', () => {
  it('returns an error payload without retryAfter by default', () => {
    expect(createErrorResponse('Failed')).toEqual({ error: 'Failed' });
  });

  it('includes retryAfter when provided', () => {
    expect(createErrorResponse('Failed', { retryAfter: 42 })).toEqual({
      error: 'Failed',
      retryAfter: 42,
    });
  });

  it('ignores invalid retryAfter values', () => {
    expect(createErrorResponse('Failed', { retryAfter: Number.NaN })).toEqual({
      error: 'Failed',
    });
  });
});
