import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import HelpLink from '../components/common/HelpLink';
import DocsViewer from '../components/common/DocsViewer';
import {
  __TEST__,
  DOCS_HASH_PREFIX,
  openDocAnchor,
  registerDocAnchor,
} from '../components/common/docsRegistry';

describe('HelpLink', () => {
  beforeEach(() => {
    __TEST__.reset();
    window.location.hash = '';
  });

  it('derives accessible name from registered anchors', () => {
    registerDocAnchor({
      id: 'settings.theme',
      title: 'Theme preferences',
      description: 'Walkthrough for configuring accent colours.',
      srHint: 'Opens Docs Viewer showing Theme preferences section.',
    });

    render(<HelpLink anchor="settings.theme" />);

    expect(
      screen.getByRole('link', {
        name: /learn about theme preferences/i,
      }),
    ).toBeInTheDocument();
  });

  it('falls back gracefully when anchor metadata is missing', async () => {
    const user = userEvent.setup();
    render(<HelpLink anchor="missing-anchor" />);

    const link = screen.getByRole('link', {
      name: /open documentation viewer/i,
    });
    await user.click(link);
    expect(window.location.hash).toBe(`${DOCS_HASH_PREFIX}missing-anchor`);
  });

  it('activates DocsViewer via hash navigation', async () => {
    registerDocAnchor({
      id: 'settings/theme',
      title: 'Theme and appearance',
      description: 'Covers wallpapers, density, and accessibility.',
      content: () => (
        <div>
          <p>Theme quick start</p>
        </div>
      ),
    });

    const user = userEvent.setup();

    render(
      <div>
        <HelpLink anchor="settings/theme" />
        <DocsViewer />
      </div>,
    );

    await user.click(
      screen.getByRole('link', {
        name: /theme and appearance/i,
      }),
    );

    expect(window.location.hash).toBe(`${DOCS_HASH_PREFIX}${encodeURIComponent('settings/theme')}`);
    expect(
      await screen.findByRole('heading', { name: 'Theme and appearance' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Theme quick start')).toBeInTheDocument();
  });

  it('supports keyboard activation with the Space key', async () => {
    registerDocAnchor({
      id: 'settings.fonts',
      title: 'Icon and font scaling',
    });

    const user = userEvent.setup();

    render(
      <div>
        <HelpLink anchor="settings.fonts" />
        <DocsViewer />
      </div>,
    );

    const link = screen.getByRole('link', {
      name: /icon and font scaling/i,
    });

    link.focus();
    await user.keyboard('{Space}');

    expect(window.location.hash).toBe(`${DOCS_HASH_PREFIX}settings.fonts`);
    expect(
      await screen.findByRole('heading', { name: 'Icon and font scaling' }),
    ).toBeInTheDocument();
  });
});

describe('docsRegistry helpers', () => {
  beforeEach(() => {
    __TEST__.reset();
    window.location.hash = '';
  });

  it('openDocAnchor updates the hash and emits events', () => {
    const listener = jest.fn();
    window.addEventListener('hashchange', listener);

    registerDocAnchor({
      id: 'networking.vlan',
      title: 'VLAN discovery',
    });

    const result = openDocAnchor('networking.vlan');

    expect(result).toBe(`${DOCS_HASH_PREFIX}networking.vlan`);
    expect(window.location.hash).toBe(`${DOCS_HASH_PREFIX}networking.vlan`);
    expect(listener).toHaveBeenCalled();

    window.removeEventListener('hashchange', listener);
  });
});

