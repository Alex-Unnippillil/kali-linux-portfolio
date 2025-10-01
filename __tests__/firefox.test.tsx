import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Firefox from '../components/apps/firefox';

describe('Firefox app', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders the default address with a simulation fallback', () => {
    render(<Firefox />);
    const input = screen.getByLabelText('Address');
    expect(input).toHaveValue('https://www.kali.org/docs/');
    expect(screen.getByRole('heading', { name: 'Kali Linux Documentation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open kali.org\/docs/i })).toHaveAttribute(
      'href',
      'https://www.kali.org/docs/'
    );
  });

  it('navigates to entered urls', async () => {
    const user = userEvent.setup();
    render(<Firefox />);
    const input = screen.getByLabelText('Address');
    await user.clear(input);
    await user.type(input, 'example.com');
    await user.click(screen.getByRole('button', { name: 'Go' }));
    const frame = await screen.findByTitle('Firefox');
    expect(frame).toHaveAttribute('src', 'https://example.com/');
    expect(localStorage.getItem('firefox:last-url')).toBe('https://example.com/');
  });

  it('opens bookmarks when clicked and shows their simulations', async () => {
    const user = userEvent.setup();
    render(<Firefox />);
    const bookmark = await screen.findByRole('button', { name: 'Kali NetHunter' });
    await user.click(bookmark);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Kali NetHunter & Downloads' })).toBeInTheDocument()
    );
    expect(localStorage.getItem('firefox:last-url')).toBe('https://www.kali.org/get-kali/#kali-platforms');
  });

  it('duplicates history when opening the address with Cmd+Enter', async () => {
    const user = userEvent.setup();
    render(<Firefox />);
    const input = screen.getByLabelText('Address');

    await user.clear(input);
    await user.type(input, 'example.com{enter}');
    await user.clear(input);
    await user.type(input, 'https://www.kali.org/tools/{enter}');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Kali Linux Tools Catalog' })).toBeInTheDocument()
    );

    await user.clear(input);
    await user.type(input, 'https://www.kali.org/docs/');
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /kali linux documentation/i })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    );

    const persisted = localStorage.getItem('firefox:tabs-state');
    expect(persisted).not.toBeNull();
    const parsed = JSON.parse(persisted ?? '[]');
    expect(parsed).toHaveLength(2);
    const newTabState = parsed.find((tab: any) => tab.title === 'Kali Linux Documentation');
    expect(newTabState).toBeDefined();
    expect(newTabState.history).toEqual([
      'https://www.kali.org/docs/',
      'https://example.com/',
      'https://www.kali.org/tools/',
      'https://www.kali.org/docs/',
    ]);
  });

  it('opens simulation links in a background tab on middle click', async () => {
    render(<Firefox />);
    const link = await screen.findByRole('link', { name: 'What is Kali Linux?' });
    fireEvent(
      link,
      new MouseEvent('auxclick', { button: 1, bubbles: true, cancelable: true, shiftKey: false }),
    );

    await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(2));

    const tabs = screen.getAllByRole('tab');
    const activeTab = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true');
    expect(activeTab).toHaveTextContent(/kali linux documentation/i);

    const backgroundTab = tabs.find((tab) => tab !== activeTab);
    expect(backgroundTab).toHaveTextContent(/www\.kali\.org/i);
    expect(backgroundTab).toHaveAttribute('aria-selected', 'false');

    const persisted = localStorage.getItem('firefox:tabs-state');
    expect(persisted).not.toBeNull();
    const parsed = JSON.parse(persisted ?? '[]');
    expect(parsed).toHaveLength(2);
    const middleTab = parsed.find((tab: any) => tab.title === 'www.kali.org');
    expect(middleTab).toBeDefined();
    expect(middleTab.history).toEqual([
      'https://www.kali.org/docs/',
      'https://www.kali.org/docs/introduction/what-is-kali-linux/',
    ]);
  });
});
