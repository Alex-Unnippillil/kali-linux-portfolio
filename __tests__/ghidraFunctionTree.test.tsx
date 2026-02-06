import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import FunctionTree from '../components/apps/ghidra/FunctionTree';

describe('FunctionTree', () => {
  const functions = [
    { name: 'main', calls: [] },
    { name: 'helper', calls: [] },
    { name: 'compute', calls: [] },
  ];

  it('filters functions by name with debounce', () => {
    jest.useFakeTimers();
    render(
      <FunctionTree
        functions={functions}
        onSelect={jest.fn()}
        selected="main"
        pinned={[]}
        onTogglePin={jest.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Filter functions'), {
      target: { value: 'help' },
    });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.getByText('helper')).toBeInTheDocument();
    expect(screen.queryByText('main')).not.toBeInTheDocument();
    expect(screen.queryByText('compute')).not.toBeInTheDocument();

    jest.useRealTimers();
  });

  it('renders pinned functions in favorites and triggers toggle', () => {
    const handleToggle = jest.fn();
    render(
      <FunctionTree
        functions={functions}
        onSelect={jest.fn()}
        selected="main"
        pinned={['helper']}
        onTogglePin={handleToggle}
      />
    );

    expect(screen.getByText('Favorites')).toBeInTheDocument();
    const favoritesSection = screen.getByText('Favorites').closest('div');
    expect(favoritesSection).not.toBeNull();
    const [unpinButton] = within(favoritesSection as HTMLElement).getAllByRole(
      'button',
      { name: 'Unpin helper' }
    );
    fireEvent.click(unpinButton);

    expect(handleToggle).toHaveBeenCalledWith('helper');
  });
});
