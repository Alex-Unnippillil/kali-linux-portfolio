import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HelpHub from '../components/apps/help-hub';

describe('HelpHub', () => {
  let openSpy: jest.SpyInstance;

  beforeEach(() => {
    openSpy = jest
      .spyOn(window, 'open')
      .mockImplementation(() => null as unknown as Window);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('prioritizes direct matches when searching', async () => {
    render(<HelpHub />);
    const search = screen.getByLabelText('Search tips');
    fireEvent.change(search, { target: { value: 'keyboard' } });

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('data-tip-id', 'keyboard-shortcuts');
    });
  });

  it('filters topics by selected tag', async () => {
    render(<HelpHub />);
    const tagToggle = screen.getByLabelText('safety');
    fireEvent.click(tagToggle);

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveAttribute('data-tip-id', 'simulate-tools-safely');
    });
  });

  it('invokes openApp when an action targets an app', () => {
    const openApp = jest.fn();
    render(<HelpHub openApp={openApp} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));
    expect(openApp).toHaveBeenCalledWith('settings');
  });

  it('opens external links in a new tab when requested', async () => {
    render(<HelpHub />);
    const search = screen.getByLabelText('Search tips');
    fireEvent.change(search, { target: { value: 'keyboard' } });
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('data-tip-id', 'keyboard-shortcuts');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Keyboard-only guidance' }));
    expect(window.open).toHaveBeenCalledWith(
      'https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/main/docs/keyboard-only-test-plan.md',
      '_blank',
      'noopener'
    );
  });
});
