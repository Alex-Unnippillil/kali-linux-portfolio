import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import GlobalSearch from '../components/search/GlobalSearch';

jest.useFakeTimers();

describe('GlobalSearch component', () => {
  it('shows results for query', async () => {
    render(<GlobalSearch open onClose={() => {}} />);
    const input = screen.getByRole('textbox', { name: /search query/i });
    fireEvent.change(input, { target: { value: 'gobuster' } });
    await act(async () => {
      jest.runAllTimers();
    });
    const link = await screen.findByRole('link', { name: /gobuster/i });
    expect(link).toBeInTheDocument();
  });

  it('navigates with arrow keys', async () => {
    const searchFn = jest.fn(async () => [
      { id: '1', title: 'First', url: '#', section: 'content' },
      { id: '2', title: 'Second', url: '#', section: 'content' },
    ]);
    render(<GlobalSearch open onClose={() => {}} searchFn={searchFn} />);
    const input = screen.getByRole('textbox', { name: /search query/i });
    fireEvent.change(input, { target: { value: 'test' } });
    await act(async () => {
      jest.runAllTimers();
    });
    let links = await screen.findAllByRole('link');
    expect(links[0]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(document, { key: 'ArrowDown' });
    links = await screen.findAllByRole('link');
    expect(links[1]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(document, { key: 'ArrowUp' });
    links = await screen.findAllByRole('link');
    expect(links[0]).toHaveAttribute('aria-selected', 'true');
  });
});
