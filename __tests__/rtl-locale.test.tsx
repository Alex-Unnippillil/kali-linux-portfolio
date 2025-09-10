import { renderHook } from '@testing-library/react';
import useLocale from '../hooks/useLocale';

describe('useLocale', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir');
  });

  test('applies rtl direction when locale is rtl', () => {
    const original = Intl.DateTimeFormat;
    // @ts-expect-error override Intl in test
    Intl.DateTimeFormat = jest.fn().mockReturnValue({
      resolvedOptions: () => ({ locale: 'ar' }),
    });

    const { result } = renderHook(() => useLocale());

    expect(result.current.locale).toBe('ar');
    expect(result.current.dir).toBe('rtl');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');

    Intl.DateTimeFormat = original;
  });

  test('defaults to ltr direction', () => {
    const original = Intl.DateTimeFormat;
    // @ts-expect-error override Intl in test
    Intl.DateTimeFormat = jest.fn().mockReturnValue({
      resolvedOptions: () => ({ locale: 'en-US' }),
    });

    const { result } = renderHook(() => useLocale());

    expect(result.current.dir).toBe('ltr');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');

    Intl.DateTimeFormat = original;
  });
});
