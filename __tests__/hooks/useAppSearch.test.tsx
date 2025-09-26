import React from 'react';
import { render, renderHook, act } from '@testing-library/react';
import useAppSearch from '../../hooks/useAppSearch';

describe('useAppSearch', () => {
  it('debounces and filters results with highlight output', () => {
    jest.useFakeTimers();
    try {
      const items = [
        { id: 'terminal', label: 'Terminal' },
        { id: 'files', label: 'Files' },
        { id: 'notes', label: 'Sticky Notes' },
      ];

      const { result } = renderHook(() =>
        useAppSearch(items, {
          getLabel: (item) => item.label,
          debounceMs: 100,
        }),
      );

      act(() => {
        result.current.setQuery('term');
      });

      act(() => {
        jest.advanceTimersByTime(99);
      });

      expect(result.current.metadata.isSearching).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(result.current.metadata.isSearching).toBe(false);
      expect(result.current.results).toHaveLength(1);
      expect(result.current.results[0]?.item.id).toBe('terminal');

      const { container } = render(<div>{result.current.highlight('Terminal')}</div>);
      const mark = container.querySelector('mark');
      expect(mark).toHaveTextContent(/term/i);
    } finally {
      jest.useRealTimers();
    }
  });
});
