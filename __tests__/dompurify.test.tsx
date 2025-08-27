import React from 'react';
import { render, screen } from '@testing-library/react';
import DOMPurify from 'dompurify';

type Props = { html: string };

function Sanitized({ html }: Props) {
  return <div data-testid="content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}

describe('DOMPurify sanitization', () => {
  it('renders allowed content', () => {
    render(<Sanitized html="<p>Safe</p>" />);
    expect(screen.getByTestId('content').innerHTML).toBe('<p>Safe</p>');
  });

  it('strips unsafe tags and attributes', () => {
    render(<Sanitized html='<img src="x" onerror="alert(1)"><script>alert(1)</script>' />);
    const content = screen.getByTestId('content');
    expect(content.querySelector('script')).toBeNull();
    const img = content.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('onerror')).toBeNull();
  });
});
