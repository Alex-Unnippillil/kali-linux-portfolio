import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ContextHelp from '../components/common/ContextHelp';
import {
  contextHelpRegistry,
  createRuleRegistry,
  ContextHelpRule,
} from '../modules/context-help/registry';

const mockRouter = {
  asPath: '/',
  pathname: '/',
  locale: 'en',
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

describe('contextHelpRegistry', () => {
  it('matches routes and localises text', () => {
    const cards = contextHelpRegistry.resolve({
      route: '/apps/ssh',
      appId: 'ssh',
      locale: 'es',
    });

    expect(cards).toHaveLength(1);
    expect(cards[0].title).toContain('SSH');
    expect(cards[0].body).toContain('demostración');
  });

  it('allows custom registries', () => {
    const rules: ContextHelpRule[] = [
      {
        id: 'test.rule',
        match: (context) => context.route === '/apps/tester',
        cards: [
          {
            id: 'test.card',
            title: { en: 'Tester', fr: 'Testeur' },
            body: { en: 'English', fr: 'Français' },
          },
        ],
      },
    ];

    const registry = createRuleRegistry(rules);
    const cards = registry.resolve({ route: '/apps/tester', locale: 'fr' });
    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe('Testeur');
  });
});

describe('ContextHelp component', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockRouter.asPath = '/apps/ssh';
    mockRouter.pathname = '/apps/[app]';
    mockRouter.locale = 'en';
  });

  it('opens with F1, focuses the dialog, and exposes accessibility attributes', async () => {
    render(<ContextHelp />);

    fireEvent.keyDown(window, { key: 'F1' });

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => {
      expect(document.activeElement).toBe(dialog);
    });
    expect(screen.getByRole('heading', { level: 3, name: /Simulated SSH sessions/i })).toBeInTheDocument();
  });

  it('persists dismissed cards and announces when none remain', async () => {
    const { unmount } = render(<ContextHelp />);
    fireEvent.keyDown(window, { key: 'F1' });
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: /dismiss this help card/i }));

    await waitFor(() => {
      const stored = window.localStorage.getItem('context-help:dismissed');
      expect(stored).toContain('apps.ssh.connection');
    });

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    unmount();

    const rerenderResult = render(<ContextHelp />);
    fireEvent.keyDown(window, { key: 'F1' });

    await screen.findByRole('dialog');
    expect(
      await screen.findByText(/all available help cards for this screen were dismissed/i)
    ).toBeInTheDocument();

    rerenderResult.unmount();
  });
});
