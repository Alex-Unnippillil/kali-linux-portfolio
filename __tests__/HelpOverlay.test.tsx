import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HelpOverlay from '../components/apps/HelpOverlay';

describe('HelpOverlay', () => {
  it('returns null when no instructions exist for the game', () => {
    const { container } = render(<HelpOverlay gameId="unknown" onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders instructions when available', () => {
    render(<HelpOverlay gameId="2048" onClose={() => {}} />);
    expect(screen.getByText('2048 Help')).toBeInTheDocument();
    expect(
      screen.getByText('Reach the 2048 tile by merging numbers.')
    ).toBeInTheDocument();
    const filterInput = screen.getByLabelText(/filter shortcuts/i);
    expect(filterInput).toBeInTheDocument();

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent(/up/i);
    expect(items[0]).toHaveTextContent(/ArrowUp/i);
  });

  it('filters shortcuts by text and highlights matches', async () => {
    const user = userEvent.setup();
    render(<HelpOverlay gameId="2048" onClose={() => {}} />);

    const filterInput = screen.getByLabelText(/filter shortcuts/i);
    await user.clear(filterInput);
    await user.type(filterInput, 'left');

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent(/left/i);
    expect(items[0]).toHaveTextContent(/ArrowLeft/i);
    expect(items[0].querySelectorAll('mark')).toHaveLength(2);

    const remapButtons = screen.getAllByRole('button', { name: /change key for/i });
    expect(remapButtons).toHaveLength(1);
    expect(remapButtons[0]).toHaveTextContent(/ArrowLeft/i);

    expect(screen.getByRole('status')).toHaveTextContent('1 of 4 shortcuts shown');

    await user.clear(filterInput);
    await user.type(filterInput, 'zzz');
    expect(screen.getByText(/No shortcuts match/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('0 of 4 shortcuts shown');
    expect(
      screen.queryAllByRole('button', { name: /change key for/i })
    ).toHaveLength(0);
  });
});
