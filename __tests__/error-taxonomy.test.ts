import { classifyError, getErrorPresentation, NetworkError, ParseError, PermissionError } from '../lib/error-taxonomy';

describe('error taxonomy', () => {
  it('classifies custom network errors', () => {
    const result = classifyError(new NetworkError('Network unreachable'));
    expect(result.category).toBe('network');
    expect(result.retryable).toBe(true);
  });

  it('classifies fetch failures as network issues', () => {
    const result = classifyError(new TypeError('Failed to fetch resource'));
    expect(result.category).toBe('network');
  });

  it('classifies syntax errors as parse errors', () => {
    const result = classifyError(new SyntaxError('Unexpected token < in JSON'));
    expect(result.category).toBe('parse');
    expect(result.retryable).toBe(true);
  });

  it('classifies permission denials', () => {
    const result = classifyError(new PermissionError('Permission denied for camera'));
    expect(result.category).toBe('permission');
    expect(result.retryable).toBe(false);
  });

  it('falls back to unknown for other errors', () => {
    const result = classifyError(new Error('totally unexpected'));
    expect(result.category).toBe('unknown');
    expect(result.retryable).toBe(false);
  });

  it('provides tailored presentations', () => {
    expect(getErrorPresentation(classifyError(new NetworkError())).primaryActionLabel).toBe('Retry request');
    expect(getErrorPresentation(classifyError(new ParseError())).primaryActionLabel).toBe('Reset view');
    expect(getErrorPresentation(classifyError(new PermissionError())).primaryActionLabel).toBe('Retry with permissions');
    expect(getErrorPresentation(classifyError(new Error())).primaryActionLabel).toBe('Try again');
  });
});
