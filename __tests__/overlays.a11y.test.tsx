import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import AllApplications from '../components/screen/all-applications';
import ShortcutSelector from '../components/screen/shortcut-selector';
import WindowSwitcher from '../components/screen/window-switcher';
import QuickSettings from '../components/ui/QuickSettings';

expect.extend(toHaveNoViolations);

const sampleApps = [
  { id: 'terminal', title: 'Terminal', icon: '/themes/Yaru/apps/utilities-terminal.svg' },
  { id: 'files', title: 'Files', icon: '/themes/Yaru/system/folder.png' },
];

const sampleGames = [
  { id: 'sudoku', title: 'Sudoku', icon: '/themes/Yaru/apps/sudoku.svg' },
];

describe('Desktop overlays accessibility', () => {
  test('AllApplications traps focus and responds to Escape', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const { container } = render(
      <AllApplications apps={sampleApps} games={sampleGames} openApp={jest.fn()} onClose={onClose} />,
    );

    const search = screen.getByRole('textbox', { name: /search applications/i });
    expect(document.activeElement).toBe(search);
    const closeButton = screen.getByRole('button', { name: /close launcher/i });

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(closeButton);

    await user.tab();
    expect(document.activeElement).toBe(search);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('Shortcut selector keeps focus inside and closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onSelect = jest.fn();
    const { container } = render(
      <ShortcutSelector apps={sampleApps} games={sampleGames} onClose={onClose} onSelect={onSelect} />,
    );

    const search = screen.getByRole('textbox', { name: /search shortcuts/i });
    const closeButton = screen.getByRole('button', { name: /close shortcut selector/i });
    expect(document.activeElement).toBe(search);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(closeButton);

    await user.tab();
    expect(document.activeElement).toBe(search);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('Window switcher manages focus order and Escape', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const { container } = render(
      <WindowSwitcher
        windows={[
          { id: 'terminal', title: 'Terminal' },
          { id: 'editor', title: 'Editor' },
        ]}
        onSelect={jest.fn()}
        onClose={onClose}
      />,
    );

    const search = screen.getByRole('textbox', { name: /search windows/i });
    const closeButton = screen.getByRole('button', { name: /close window switcher/i });
    expect(document.activeElement).toBe(search);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(closeButton);

    await user.tab();
    expect(document.activeElement).toBe(search);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('Quick settings dialog traps focus and handles Escape', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const { container } = render(
      <div className="relative">
        <QuickSettings open onClose={onClose} />
      </div>,
    );

    const themeButton = screen.getByRole('button', { name: /theme/i });
    const quickClose = screen.getByRole('button', { name: /close quick settings/i });

    expect(document.activeElement).toBe(themeButton);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(quickClose);

    await user.tab();
    expect(document.activeElement).toBe(themeButton);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    const dialog = screen.getByRole('dialog', { name: /quick settings/i });
    const results = await axe(dialog);
    expect(results).toHaveNoViolations();
  });
});
