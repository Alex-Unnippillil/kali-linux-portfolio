import { render, screen, fireEvent } from '@testing-library/react';
import QuickLaunch, { AppShortcut } from '../components/desktop/QuickLaunch';

describe('QuickLaunch', () => {
  const sampleApps: AppShortcut[] = [
    { id: 'terminal', title: 'Terminal', icon: '/icons/terminal.svg', favourite: true },
    { id: 'files', title: 'Files', icon: '/icons/files.svg', favourite: true },
    { id: 'browser', title: 'Browser', icon: '/icons/browser.svg', favourite: false },
    { id: 'notes', title: 'Notes', icon: '/icons/notes.svg', favourite: true },
  ];

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders favourite apps as pinned with numeric hints', () => {
    render(<QuickLaunch apps={sampleApps} />);

    const terminalButton = screen.getByRole('button', {
      name: /Launch Terminal \(Alt\+1\)/i,
    });
    const filesButton = screen.getByRole('button', {
      name: /Launch Files \(Alt\+2\)/i,
    });

    expect(terminalButton).toHaveAttribute('data-hotkey', '1');
    expect(filesButton).toHaveAttribute('data-hotkey', '2');
  });

  it('launches the correct app when pressing Alt+1', () => {
    const onLaunch = jest.fn();
    render(<QuickLaunch apps={sampleApps} onLaunch={onLaunch} />);

    fireEvent.keyDown(window, { altKey: true, key: '1' });

    expect(onLaunch).toHaveBeenCalledWith('terminal');
  });

  it('ignores Alt shortcuts when focus is in an editable control', () => {
    const onLaunch = jest.fn();
    render(
      <div>
        <input data-testid="shortcut-input" />
        <QuickLaunch apps={sampleApps} onLaunch={onLaunch} />
      </div>
    );

    const input = screen.getByTestId('shortcut-input');
    input.focus();
    fireEvent.keyDown(input, { altKey: true, key: '1' });

    expect(onLaunch).not.toHaveBeenCalled();
  });

  it('allows drag and drop reordering of pinned apps', () => {
    render(<QuickLaunch apps={sampleApps} />);

    const notesButton = screen.getByRole('button', {
      name: /Launch Notes \(Alt\+3\)/i,
    });
    const terminalButton = screen.getByRole('button', {
      name: /Launch Terminal \(Alt\+1\)/i,
    });

    const dataTransfer = {
      data: {} as Record<string, string>,
      setData(key: string, value: string) {
        this.data[key] = value;
      },
      getData(key: string) {
        return this.data[key];
      },
      dropEffect: 'move',
      effectAllowed: 'move',
    };

    fireEvent.dragStart(notesButton, { dataTransfer });
    fireEvent.dragOver(terminalButton, { dataTransfer });
    fireEvent.drop(terminalButton, { dataTransfer });
    fireEvent.dragEnd(notesButton, { dataTransfer });

    const orderedButtons = screen.getAllByRole('button', { name: /Launch/ });
    expect(orderedButtons[0]).toHaveAttribute('aria-label', expect.stringContaining('Notes'));

    const stored = JSON.parse(window.localStorage.getItem('quick-launch-pins') || '[]');
    expect(stored[0]).toBe('notes');
  });

  it('allows pinning additional apps via the selector', () => {
    render(<QuickLaunch apps={sampleApps} />);

    const select = screen.getByLabelText('Pin application');
    fireEvent.change(select, { target: { value: 'browser' } });

    expect(
      screen.getByRole('button', {
        name: /Launch Browser/,
      })
    ).toBeInTheDocument();

    const stored = JSON.parse(window.localStorage.getItem('quick-launch-pins') || '[]');
    expect(stored).toContain('browser');
  });

  it('removes apps when the unpin button is pressed', () => {
    render(<QuickLaunch apps={sampleApps} />);

    const removeButton = screen.getByRole('button', { name: 'Unpin Terminal' });
    fireEvent.click(removeButton);

    expect(
      screen.queryByRole('button', {
        name: /Launch Terminal/,
      })
    ).not.toBeInTheDocument();

    const stored = JSON.parse(window.localStorage.getItem('quick-launch-pins') || '[]');
    expect(stored).not.toContain('terminal');
  });
});
