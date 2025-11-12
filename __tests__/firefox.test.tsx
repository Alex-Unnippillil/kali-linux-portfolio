import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
    const sandboxNotice = screen.getByRole('region', { name: 'Sandboxed Firefox view' });
    expect(sandboxNotice).toHaveTextContent('Downloads, device permissions, pop-up windows, and clipboard access are blocked');
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
    expect(frame).toHaveAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms');
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

  it('shows a sandboxed fallback card for live sites', async () => {
    const user = userEvent.setup();
    render(<Firefox />);
    const input = screen.getByLabelText('Address');
    await user.clear(input);
    await user.type(input, 'example.com');
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(await screen.findByRole('heading', { name: 'Sandboxed live preview' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /offsec/i })[0]).toHaveAttribute('target', '_blank');
  });

  it('quick fills the address bar from favicon shortcuts', async () => {
    const user = userEvent.setup();
    render(<Firefox />);
    const quickFill = await screen.findByRole('button', { name: /fill address with offsec/i });
    await user.click(quickFill);
    const input = screen.getByLabelText('Address');
    expect(input).toHaveValue('https://www.offsec.com/?utm_source=kali&utm_medium=os&utm_campaign=firefox');
    expect(localStorage.getItem('firefox:last-url')).toBeNull();
  });
});
