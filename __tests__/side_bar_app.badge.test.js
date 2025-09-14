import SideBarApp from '../components/base/side_bar_app';

describe('SideBarApp updateBadge fallback', () => {
  const originalTitle = document.title;
  const nav = navigator;
  const originalSet = nav.setAppBadge;
  const originalClear = nav.clearAppBadge;

  beforeEach(() => {
    document.title = 'Test';
    delete nav.setAppBadge;
    delete nav.clearAppBadge;
  });

  afterEach(() => {
    document.title = originalTitle;
    if (originalSet !== undefined) nav.setAppBadge = originalSet;
    if (originalClear !== undefined) nav.clearAppBadge = originalClear;
  });

  it('prefixes and removes document.title when badge API unavailable', () => {
    const app = new SideBarApp();
    app.props = { notifications: [1], tasks: 2 };
    app.updateBadge();
    expect(document.title).toBe('(3) Test');
    app.props = { notifications: [], tasks: [] };
    app.updateBadge();
    expect(document.title).toBe('Test');
  });
});
