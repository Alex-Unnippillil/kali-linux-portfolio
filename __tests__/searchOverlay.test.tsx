import { render, screen, fireEvent } from '@testing-library/react';
import SearchOverlay, { SearchItem } from '../components/SearchOverlay';

describe('SearchOverlay', () => {
  const items: SearchItem[] = [
    { id: 'calc', title: 'Calculator', type: 'app' },
    { id: 'help', title: 'Getting Started', type: 'help', url: '#' },
  ];

  it('filters items based on query', () => {
    const onClose = jest.fn();
    const openApp = jest.fn();
    render(
      <SearchOverlay visible items={items} openApp={openApp} onClose={onClose} />
    );
    const input = screen.getByPlaceholderText(/search apps, settings, help/i);
    fireEvent.change(input, { target: { value: 'calc' } });
    expect(screen.getByText('Calculator')).toBeInTheDocument();
    expect(screen.queryByText('Getting Started')).toBeNull();
  });
});
