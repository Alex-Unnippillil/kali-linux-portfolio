import { render, screen } from '@testing-library/react';
import TermPage from '@/pages/glossary/[term]';
import { GLOSSARY } from '@/data/glossary';

const linkTerms = GLOSSARY.map((t) => t.name);

it('renders paginated references with valid links', () => {
  const { rerender } = render(<TermPage term="root" page={1} />);
  // first page shows 10 references
  expect(screen.getAllByRole('listitem').length).toBe(10);

  // verify each link points to a valid term
  screen.getAllByRole('link').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const slug = href.replace('/glossary/', '').split('?')[0];
    expect(linkTerms).toContain(slug);
  });

  // navigate to third page and ensure remaining references are rendered
  rerender(<TermPage term="root" page={3} />);
  expect(screen.getAllByRole('listitem').length).toBe(6);
  screen.getAllByRole('link').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const slug = href.replace('/glossary/', '').split('?')[0];
    expect(linkTerms).toContain(slug);
  });
});
