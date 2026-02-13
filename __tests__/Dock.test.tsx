import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dock from '../components/shell/Dock';

const apps = [
  { id: 'terminal', title: 'Terminal', icon: '/icons/terminal.svg' },
  { id: 'files', title: 'Files', icon: '/icons/files.svg' },
  { id: 'browser', title: 'Browser', icon: '/icons/browser.svg' },
];

describe('Dock component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reorders pinned apps via keyboard fallback commands', async () => {
    const user = userEvent.setup();
    render(
      <Dock
        apps={apps}
        initialPinned={['terminal', 'files']}
        storageKey="dock-component-reorder"
      />,
    );

    const terminalButton = screen.getByRole('menuitem', { name: /terminal/i });
    expect(terminalButton).toBeInTheDocument();
    terminalButton.focus();

    await user.keyboard('{Shift>}{F10}{/Shift}');

    const menu = await screen.findByRole('menu', { name: /dock item options/i });
    const moveRight = within(menu).getByRole('menuitem', { name: /move right/i });
    await user.click(moveRight);

    const buttons = screen.getAllByRole('menuitem');
    expect(buttons[0]).toHaveAccessibleName('Files');
    expect(buttons[1]).toHaveAccessibleName('Terminal');
  });

  it('pins a running app from the context menu', async () => {
    const user = userEvent.setup();
    render(
      <Dock
        apps={apps}
        initialPinned={['terminal']}
        runningAppIds={['browser']}
        storageKey="dock-component-pin"
      />,
    );

    const browserButton = screen.getByRole('menuitem', { name: /browser/i });
    expect(browserButton).toHaveAttribute('data-pinned', 'false');

    await user.pointer([{ target: browserButton, keys: '[MouseRight]' }]);

    const menu = await screen.findByRole('menu', { name: /dock item options/i });
    const pinOption = within(menu).getByRole('menuitem', { name: /pin to dock/i });
    await user.click(pinOption);

    const updatedBrowser = screen.getByRole('menuitem', { name: /browser/i });
    expect(updatedBrowser).toHaveAttribute('data-pinned', 'true');
  });
});
