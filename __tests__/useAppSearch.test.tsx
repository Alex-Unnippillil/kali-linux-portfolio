import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAppSearch, getHighlightedSegments } from '../hooks/useAppSearch';

const APPS = [
  { id: 'hydra', title: 'Hydra' },
  { id: 'metasploit', title: 'Metasploit' },
  { id: 'nmap', title: 'Nmap NSE' },
];

const SearchHarness: React.FC = () => {
  const { query, setQuery, results } = useAppSearch(APPS, { debounceMs: 0 });
  return (
    <div>
      <input
        aria-label="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div data-testid="result-count">{results.length}</div>
      <ul>
        {results.map(({ item }) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
      <output data-testid="matches">
        {JSON.stringify(results[0]?.matches ?? null)}
      </output>
    </div>
  );
};

describe('useAppSearch', () => {
  it('returns all apps when the query is empty and filters case-insensitively', () => {
    render(<SearchHarness />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);

    const input = screen.getByLabelText('search');
    fireEvent.change(input, { target: { value: 'meta' } });

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Metasploit')).toBeInTheDocument();
  });

  it('highlights the matched characters in the title', () => {
    render(<SearchHarness />);

    const input = screen.getByLabelText('search');
    fireEvent.change(input, { target: { value: 'hyd' } });

    const matchesRaw = screen.getByTestId('matches').textContent ?? 'null';
    const matches = JSON.parse(matchesRaw);
    const segments = getHighlightedSegments('Hydra', matches, 'title');
    const highlighted = segments
      .filter((segment) => segment.match)
      .map((segment) => segment.text)
      .join('')
      .toLowerCase();

    expect(highlighted).toBe('hyd');
  });
});
