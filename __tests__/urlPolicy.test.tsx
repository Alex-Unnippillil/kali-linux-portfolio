import { render, screen } from '@testing-library/react';
import ExplainerPane from '../components/ExplainerPane';
import { computeRelAttribute, LINK_UNAVAILABLE_COPY, sanitizeUrl } from '../utils/urlPolicy';

describe('sanitizeUrl', () => {
  it('allows https links and marks them as external', () => {
    const result = sanitizeUrl('https://example.com/path');
    expect(result).toEqual({ href: 'https://example.com/path', isExternal: true });
  });

  it('preserves relative links', () => {
    const result = sanitizeUrl('/docs/guide');
    expect(result).toEqual({ href: '/docs/guide', isExternal: false });
  });

  it('rejects javascript URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejects data URLs', () => {
    expect(sanitizeUrl('data:text/html,alert(1)')).toBeNull();
  });
});

describe('computeRelAttribute', () => {
  it('ensures noopener noreferrer for external links', () => {
    expect(computeRelAttribute(true)).toBe('noopener noreferrer');
  });

  it('merges existing rel tokens', () => {
    expect(computeRelAttribute(true, 'nofollow')).toBe('nofollow noopener noreferrer');
  });
});

describe('ExplainerPane', () => {
  it('shows an unavailable message for rejected URLs', () => {
    render(
      <ExplainerPane
        lines={['Item']}
        resources={[{ label: 'Unsafe', url: 'javascript:alert(1)' }]}
      />
    );

    expect(
      screen.getByText(`Unsafe (${LINK_UNAVAILABLE_COPY})`, { exact: false }),
    ).toBeInTheDocument();
  });
});
