import { Desktop } from '../components/screen/desktop';

describe('arrangeEditorTerminal', () => {
  it('tiles terminal and editor when enabled', () => {
    const desktop: any = new Desktop();
    desktop.props = { editorTerminalSplit: true, snapEnabled: true };
    desktop.windowRefs = {
      terminal: { snapWindow: jest.fn() },
      vscode: { snapWindow: jest.fn() },
    };
    desktop.state = {
      ...desktop.state,
      closed_windows: { terminal: false, vscode: false },
    };
    desktop.arrangeEditorTerminal();
    expect(desktop.windowRefs.terminal.snapWindow).toHaveBeenCalledWith('left', 38);
    expect(desktop.windowRefs.vscode.snapWindow).toHaveBeenCalledWith('right', 62);
  });

  it('respects setting to disable tiling', () => {
    const desktop: any = new Desktop();
    desktop.props = { editorTerminalSplit: false, snapEnabled: true };
    desktop.windowRefs = {
      terminal: { snapWindow: jest.fn() },
      vscode: { snapWindow: jest.fn() },
    };
    desktop.state = {
      ...desktop.state,
      closed_windows: { terminal: false, vscode: false },
    };
    desktop.arrangeEditorTerminal();
    expect(desktop.windowRefs.terminal.snapWindow).not.toHaveBeenCalled();
    expect(desktop.windowRefs.vscode.snapWindow).not.toHaveBeenCalled();
  });
});
