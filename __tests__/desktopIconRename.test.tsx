import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));

const createDesktopInstance = () => {
  const desktop = new Desktop();
  desktop.setState = (updater: any, callback?: () => void) => {
    const prevState = desktop.state;
    const partial =
      typeof updater === 'function' ? updater(prevState, desktop.props) : updater;
    if (partial) {
      desktop.state = { ...prevState, ...partial };
    }
    if (callback) callback();
  };
  return desktop;
};

beforeEach(() => {
  localStorage.clear();
});

describe('Desktop icon rename persistence', () => {
  it('trims and persists custom titles', () => {
    const desktop = createDesktopInstance();
    const appId = 'terminal';

    desktop.state = {
      ...desktop.state,
      desktop_icon_positions: { [appId]: { x: 10, y: 20 } },
      desktop_icon_titles: {},
      renamingIconId: appId,
      renameDraft: '  Custom Terminal  ',
    };

    desktop.commitIconRename();

    expect(desktop.state.desktop_icon_titles[appId]).toBe('Custom Terminal');
    expect(desktop.state.renamingIconId).toBeNull();
    expect(desktop.state.renameDraft).toBe('');

    const stored = JSON.parse(localStorage.getItem('desktop_icon_positions') || '{}');
    expect(stored).toEqual({
      positions: { [appId]: { x: 10, y: 20 } },
      titles: { [appId]: 'Custom Terminal' },
    });
  });

  it('drops titles that are only whitespace', () => {
    const desktop = createDesktopInstance();
    const appId = 'terminal';

    desktop.state = {
      ...desktop.state,
      desktop_icon_positions: { [appId]: { x: 5, y: 15 } },
      desktop_icon_titles: { [appId]: 'Existing' },
      renamingIconId: appId,
      renameDraft: '   ',
    };

    desktop.commitIconRename();

    expect(desktop.state.desktop_icon_titles[appId]).toBeUndefined();
    expect(desktop.state.renamingIconId).toBeNull();

    const stored = JSON.parse(localStorage.getItem('desktop_icon_positions') || '{}');
    expect(stored).toEqual({
      positions: { [appId]: { x: 5, y: 15 } },
      titles: {},
    });
  });

  it('limits stored titles to the configured length', () => {
    const desktop = createDesktopInstance();
    const appId = 'terminal';
    const limit = desktop.maxIconTitleLength;
    const longTitle = 'A'.repeat(limit + 10);

    desktop.state = {
      ...desktop.state,
      desktop_icon_positions: { [appId]: { x: 12, y: 24 } },
      desktop_icon_titles: {},
      renamingIconId: appId,
      renameDraft: longTitle,
    };

    desktop.commitIconRename();

    const storedTitle = desktop.state.desktop_icon_titles[appId];
    expect(storedTitle).toBe(longTitle.slice(0, limit));
    expect(storedTitle).toHaveLength(limit);

    const stored = JSON.parse(localStorage.getItem('desktop_icon_positions') || '{}');
    expect(stored.titles[appId]).toBe(longTitle.slice(0, limit));
  });
});
