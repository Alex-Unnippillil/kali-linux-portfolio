jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('') }));
jest.mock('../components/util-components/background-image', () => () => null);

import { Desktop } from '../components/screen/desktop';

describe('Desktop file explorer shortcuts', () => {
  it('opens the file explorer scoped to the desktop directory', () => {
    const desktop = new Desktop({});
    desktop.openApp = jest.fn();
    desktop.hideAllContextMenu = jest.fn();

    desktop.openDesktopInFiles();

    expect(desktop.hideAllContextMenu).toHaveBeenCalled();
    expect(desktop.openApp).toHaveBeenCalledWith('file-explorer', { path: '~/Desktop' });
  });
});

