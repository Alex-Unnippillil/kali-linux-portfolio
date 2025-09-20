import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import WindowSwitcher from '../components/screen/window-switcher';

describe('WindowSwitcher', () => {
  const windows = [
    { id: 'wireshark', title: 'Wireshark' },
    { id: 'calculator', title: 'Calculator' },
    { id: 'hashcat', title: 'Hashcat' },
  ];

  it('filters windows by tag metadata and highlights matches', () => {
    render(<WindowSwitcher windows={windows} onSelect={jest.fn()} onClose={jest.fn()} />);

    const input = screen.getByPlaceholderText('Search windows');
    fireEvent.change(input, { target: { value: 'network' } });

    expect(screen.getByText('Wireshark')).toBeInTheDocument();
    expect(screen.queryByText('Calculator')).not.toBeInTheDocument();
    expect(screen.getByText('network', { selector: 'mark' })).toBeInTheDocument();
  });

  it('captures typing even when the search field is unfocused', () => {
    render(<WindowSwitcher windows={windows} onSelect={jest.fn()} onClose={jest.fn()} />);

    const input = screen.getByPlaceholderText('Search windows');
    input.blur();

    fireEvent.keyDown(window, { key: 'p' });

    expect(input).toHaveValue('p');
  });

  it('resets the query when closed', () => {
    const onClose = jest.fn();
    render(<WindowSwitcher windows={windows} onSelect={jest.fn()} onClose={onClose} />);

    const input = screen.getByPlaceholderText('Search windows');
    fireEvent.change(input, { target: { value: 'hash' } });

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
    expect(input).toHaveValue('');
  });
});
