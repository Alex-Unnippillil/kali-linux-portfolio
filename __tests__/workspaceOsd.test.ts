import { Desktop } from '../components/screen/desktop';
import osdService from '../utils/osdService';

jest.mock('../utils/osdService', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

describe('workspace switch OSD', () => {
  beforeEach(() => {
    (osdService.show as jest.Mock).mockClear();
    window.localStorage.clear();
  });

  test('displays workspace number and name', () => {
    window.localStorage.setItem('workspaces', JSON.stringify(['Alpha', 'Beta', 'Gamma']));
    const desktop = new Desktop();
    desktop.setState = (updater: any, cb?: () => void) => {
      const prev = desktop.state;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      desktop.state = { ...prev, ...next };
      cb && cb();
    };
    desktop.switchWorkspace(1);
    expect(osdService.show).toHaveBeenCalledWith('Workspace 2 — Beta', 1200);
  });
});
