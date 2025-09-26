import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useAppSearch from '../hooks/useAppSearch';

type Item = {
  id: string;
  title: string;
};

function ExampleSearch({ items }: { items: Item[] }) {
  const { query, setQuery, results, highlight, metadata } = useAppSearch(items, {
    getLabel: (item) => item.title,
    debounceMs: 100,
  });

  return (
    <div>
      <input
        aria-label="Search"
        placeholder="Search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div data-testid="search-status">
        {metadata.hasQuery
          ? `${metadata.matched} of ${metadata.total} match "${metadata.debouncedQuery}"`
          : `${metadata.total} items available`}
      </div>
      <ul>
        {results.map(({ item }) => (
          <li key={item.id}>{highlight(item.title)}</li>
        ))}
      </ul>
    </div>
  );
}

describe('Whisker-style search integration', () => {
  it('filters and highlights results with metadata updates', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const items: Item[] = [
      { id: 'terminal', title: 'Terminal' },
      { id: 'files', title: 'Files' },
      { id: 'notes', title: 'Sticky Notes' },
    ];

    render(<ExampleSearch items={items} />);
    const input = screen.getByRole('textbox', { name: /search/i });

    await user.type(input, 'term');
    act(() => {
      jest.advanceTimersByTime(120);
    });

    const status = await screen.findByTestId('search-status');
    expect(status).toHaveTextContent('1 of 3 match "term"');
    const listItem = screen.getByRole('listitem');
    const mark = listItem.querySelector('mark');
    expect(mark).toHaveTextContent(/term/i);

    jest.useRealTimers();
  });
});
