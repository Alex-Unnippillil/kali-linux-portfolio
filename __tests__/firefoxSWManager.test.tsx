import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SWManager from '../components/apps/firefox/SWManager';

describe('SWManager', () => {
  it('records the registration lifecycle events in order', async () => {
    const user = userEvent.setup();
    render(<SWManager />);

    await user.click(screen.getByRole('button', { name: 'Register service worker' }));

    const messages = screen.getAllByTestId('sw-event-message').map((element) => element.textContent);

    expect(messages).toEqual([
      'Registration requested (v1)',
      'Install event fired (v1)',
      'Install event cached core assets (v1)',
      'Activate event fired (v1)',
      'Service worker activated (v1)',
      'Clients now controlled (v1)',
    ]);
  });

  it('mirrors update flows including waiting and activation events', async () => {
    const user = userEvent.setup();
    render(<SWManager />);

    await user.click(screen.getByRole('button', { name: 'Register service worker' }));
    await user.click(screen.getByRole('button', { name: 'Check for update' }));

    let messages = screen.getAllByTestId('sw-event-message').map((element) => element.textContent);
    expect(messages).toEqual([
      'Registration requested (v1)',
      'Install event fired (v1)',
      'Install event cached core assets (v1)',
      'Activate event fired (v1)',
      'Service worker activated (v1)',
      'Clients now controlled (v1)',
      'Update check started (current v1)',
      'Update found (v2)',
      'Installing update (v2)',
      'Install event cached core assets (v2)',
      'Update installed and waiting (v2)',
    ]);

    await user.click(screen.getByRole('button', { name: 'Activate update' }));

    messages = screen.getAllByTestId('sw-event-message').map((element) => element.textContent);
    expect(messages).toEqual([
      'Registration requested (v1)',
      'Install event fired (v1)',
      'Install event cached core assets (v1)',
      'Activate event fired (v1)',
      'Service worker activated (v1)',
      'Clients now controlled (v1)',
      'Update check started (current v1)',
      'Update found (v2)',
      'Installing update (v2)',
      'Install event cached core assets (v2)',
      'Update installed and waiting (v2)',
      'Skip waiting message sent (v2)',
      'Activating update (v2)',
      'Service worker activated (v2)',
      'Clients now controlled (v2)',
      'Cache storage refreshed for v2',
      'Previous worker marked redundant (v1)',
    ]);
  });

  it('allows cache entries to be updated and cleared', async () => {
    const user = userEvent.setup();
    render(<SWManager />);

    await user.click(screen.getByRole('button', { name: 'Register service worker' }));
    await user.click(screen.getByRole('button', { name: 'Check for update' }));

    const cacheSection = screen.getByTestId('cache-section-app-shell');
    let entry = within(cacheSection).getByTestId('cache-entry-root');
    expect(entry).toHaveTextContent('Status: Stale');

    await user.click(screen.getByRole('button', { name: 'Update Root document (app-shell)' }));

    entry = await within(cacheSection).findByTestId('cache-entry-root');
    expect(entry).toHaveTextContent('Revision v2');
    expect(entry).toHaveTextContent('Status: Fresh');

    await user.click(screen.getByRole('button', { name: 'Clear app-shell cache' }));

    expect(await within(cacheSection).findByText('This cache has no entries.')).toBeInTheDocument();

    const messages = screen.getAllByTestId('sw-event-message').map((element) => element.textContent);
    expect(messages).toContain('Cleared app-shell cache entries');
    expect(messages).toContain('Updated Root document in app-shell to v2');
  });
});
