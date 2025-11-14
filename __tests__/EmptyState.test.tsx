import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyState from '../components/common/EmptyState';

describe('EmptyState', () => {
  it('renders fallback copy for the provided variant', () => {
    render(<EmptyState variant="no-data" />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');

    const heading = screen.getByRole('heading', { level: 2, name: /no data available/i });
    expect(heading).toBeInTheDocument();

    const description = screen.getByText(/activity will appear here once it is recorded/i);
    expect(description).toBeInTheDocument();
    expect(status).toHaveAttribute('aria-labelledby', heading.getAttribute('id'));
    expect(status).toHaveAttribute('aria-describedby', description.getAttribute('id'));
  });

  it('merges feature configuration for actions and documentation links', async () => {
    const onClear = jest.fn();
    render(
      <EmptyState
        featureId="launcher-search"
        variant="filtered-out"
        primaryAction={{ onClick: onClear }}
      />,
    );

    const clearButton = screen.getByRole('button', {
      name: /clear the current search query/i,
    });
    await userEvent.click(clearButton);
    expect(onClear).toHaveBeenCalledTimes(1);

    const docsLink = screen.getByRole('link', { name: /app catalog/i });
    expect(docsLink).toHaveAttribute('href', 'https://unnippillil.com/apps');
    expect(docsLink).toHaveAttribute('target', '_blank');
  });

  it('creates accessible labels for custom documentation link overrides', () => {
    render(
      <EmptyState
        title="Custom state"
        description="Demonstration description"
        docsLink={{ href: '#docs', label: 'Read docs' }}
      />,
    );

    const docs = screen.getByRole('link', { name: /open documentation for custom state/i });
    expect(docs).toHaveAttribute('href', '#docs');
  });
});
