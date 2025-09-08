import { render, screen } from '@testing-library/react';
import { FootnoteProvider, Footnote } from '../components/mdx/Footnote';

describe('Footnote', () => {
  test('renders anchor and back link', () => {
    render(
      <FootnoteProvider>
        <p>
          Example<Footnote>Footnote text</Footnote>
        </p>
      </FootnoteProvider>
    );

    const refLink = screen.getByText('1');
    expect(refLink.closest('a')).toHaveAttribute('href', '#fn1');

    const backLink = screen.getByText(/Back to text/i);
    expect(backLink).toHaveAttribute('href', '#fnref1');
  });
});
