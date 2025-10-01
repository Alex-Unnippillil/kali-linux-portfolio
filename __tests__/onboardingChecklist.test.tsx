import { ReactNode } from 'react';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Checklist, { ChecklistProvider, useChecklist } from '../components/common/Checklist';
import { SettingsProvider } from '../hooks/useSettings';

describe('onboarding checklist', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SettingsProvider>
      <ChecklistProvider>{children}</ChecklistProvider>
    </SettingsProvider>
  );

  beforeEach(() => {
    window.localStorage.clear();
  });

  test('manual completion persists between sessions', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Checklist />, { wrapper });

    const terminalHeading = await screen.findByRole('heading', { name: /Launch the Terminal/i });
    const terminalItem = terminalHeading.closest('li');
    if (!terminalItem) throw new Error('Terminal task not found');

    const markButton = within(terminalItem).getByRole('button', { name: /Mark as done/i });
    await user.click(markButton);

    expect(within(terminalItem).getByText(/Completed manually/i)).toBeInTheDocument();

    // Validate localStorage snapshot
    const stored = window.localStorage.getItem('onboarding-checklist');
    expect(stored).toContain('launch-terminal');

    unmount();

    render(<Checklist />, { wrapper });

    const persistedHeading = await screen.findByRole('heading', { name: /Launch the Terminal/i });
    const persistedItem = persistedHeading.closest('li');
    if (!persistedItem) throw new Error('Terminal task not found after remount');

    expect(within(persistedItem).getByText(/Completed manually/i)).toBeInTheDocument();
    expect(within(persistedItem).queryByRole('button', { name: /Mark as done/i })).not.toBeInTheDocument();
    expect(within(persistedItem).getByRole('button', { name: /Undo/i })).toBeInTheDocument();
  });

  test('auto completion reacts to app events', async () => {
    const StatusProbe = () => {
      const { tasks } = useChecklist();
      const terminal = tasks.find((task) => task.id === 'launch-terminal');
      return <span data-testid="terminal-status">{terminal?.completed ? 'done' : 'pending'}</span>;
    };

    const statusRender = render(<StatusProbe />, { wrapper });
    expect(screen.getByTestId('terminal-status').textContent).toBe('pending');

    await act(async () => {
      window.dispatchEvent(new CustomEvent('open-app', { detail: 'terminal' }));
    });

    expect(screen.getByTestId('terminal-status').textContent).toBe('done');

    await act(async () => {
      window.dispatchEvent(new CustomEvent('checklist:nmap-scan'));
    });

    statusRender.unmount();

    const checklistView = render(<Checklist />, { wrapper });
    const scanHeading = await screen.findByRole('heading', { name: /Run the Nmap NSE demo/i });
    const scanItem = scanHeading.closest('li');
    if (!scanItem) throw new Error('Scan task not found');
    expect(within(scanItem).getByText(/Completed automatically/i)).toBeInTheDocument();
    checklistView.unmount();
  });

  test('manual completion supports undo', async () => {
    const user = userEvent.setup();
    render(<Checklist />, { wrapper });

    const browserHeading = await screen.findByRole('heading', { name: /Open the Firefox demo/i });
    const browserItem = browserHeading.closest('li');
    if (!browserItem) throw new Error('Browser task not found');

    const markButton = within(browserItem).getByRole('button', { name: /Mark as done/i });
    await user.click(markButton);

    const undoButton = within(browserItem).getByRole('button', { name: /Undo/i });
    await user.click(undoButton);

    expect(within(browserItem).getByRole('button', { name: /Mark as done/i })).toBeInTheDocument();
    expect(within(browserItem).queryByText(/Completed manually/i)).not.toBeInTheDocument();
  });
});
