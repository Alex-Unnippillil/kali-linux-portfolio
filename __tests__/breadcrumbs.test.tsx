import { render, screen } from '@testing-library/react';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';

describe('Breadcrumbs', () => {
  const items = [
    { href: '/', label: 'Home' },
    { href: '/docs', label: 'Docs' },
    { href: '/docs/page', label: 'Page' },
  ];

  it('renders links and marks current page', () => {
    render(<Breadcrumbs items={items} />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs');
    const current = screen.getByText('Page');
    expect(current.tagName).toBe('SPAN');
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('is hidden on small screens via classes', () => {
    const { container } = render(<Breadcrumbs items={items} />);
    expect(container.firstChild).toHaveClass('hidden');
  });
});
