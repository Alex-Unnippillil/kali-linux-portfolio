jest.mock('../components/screen/taskbar', () => () => null);

import { Desktop } from '../components/screen/desktop';

describe('Desktop deep link handling', () => {
  it('opens apps with normalized context', () => {
    const desktop = new Desktop({ deepLink: null });
    const openSpy = jest.spyOn(desktop, 'openApp').mockImplementation(() => {});
    const link = { app: 'terminal', context: { cmd: 'help' } };

    desktop.applyDeepLink(link as any);

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith('terminal', {
      cmd: 'help',
      initialCommand: 'help',
    });
    expect(link.context).toEqual({ cmd: 'help' });
  });

  it('ignores repeated deep links with the same signature', () => {
    const desktop = new Desktop({ deepLink: null });
    const openSpy = jest.spyOn(desktop, 'openApp').mockImplementation(() => {});
    const link = { app: 'terminal', context: { cmd: 'help' } };

    desktop.applyDeepLink(link as any);
    desktop.applyDeepLink(link as any);

    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('allows the same link after clearing the signature', () => {
    const desktop = new Desktop({ deepLink: null });
    const openSpy = jest.spyOn(desktop, 'openApp').mockImplementation(() => {});
    const link = { app: 'terminal', context: { cmd: 'help' } };

    desktop.applyDeepLink(link as any);
    expect(desktop.lastDeepLinkSignature).not.toBeNull();

    desktop.applyDeepLink(null as any);
    expect(desktop.lastDeepLinkSignature).toBeNull();

    desktop.applyDeepLink(link as any);
    expect(openSpy).toHaveBeenCalledTimes(2);
  });
});
