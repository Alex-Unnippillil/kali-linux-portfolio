import apps from '../apps.config';
import { Desktop } from '../components/screen/desktop';

const TARGET_ID = 'about';

function getTargetApp() {
  const app = apps.find((candidate) => candidate.id === TARGET_ID);
  if (!app) {
    throw new Error('Expected target app to exist');
  }
  return app;
}

function createDesktop(): Desktop {
  const desktop = new Desktop();
  // @ts-expect-error allow tests to provide props manually
  desktop.props = desktop.props || {};
  desktop.setState = function (update: any, callback?: () => void) {
    const prevState = this.state;
    const nextState = typeof update === 'function' ? update(prevState, this.props) : update;
    if (nextState) {
      this.state = { ...prevState, ...nextState };
    }
    if (typeof callback === 'function') {
      callback();
    }
  };
  desktop.applyRenamedTitles();
  return desktop;
}

describe('Desktop rename flows', () => {
  let desktop: Desktop;
  let originalTitle: string;
  let originalStored: string | undefined;

  beforeEach(() => {
    localStorage.clear();
    desktop = createDesktop();
    const app = getTargetApp();
    originalTitle = app.title;
    originalStored = app.originalTitle;
  });

  afterEach(() => {
    const app = getTargetApp();
    app.title = originalTitle;
    if (originalStored !== undefined) {
      app.originalTitle = originalStored;
    } else {
      delete app.originalTitle;
    }
    localStorage.clear();
  });

  test('committing a rename updates title and persistence', () => {
    desktop.startRename(TARGET_ID);
    desktop.handleRenameChange('Renamed App');
    desktop.commitRename();

    expect(getTargetApp().title).toBe('Renamed App');
    const stored = JSON.parse(localStorage.getItem('app_renames') || '{}');
    expect(stored[TARGET_ID]).toBe('Renamed App');
    expect(desktop.state.rename).toBeNull();
  });

  test('canceling a rename restores the original title', () => {
    desktop.startRename(TARGET_ID);
    desktop.handleRenameChange('Another Name');
    desktop.cancelRename();

    expect(getTargetApp().title).toBe(originalTitle);
    expect(desktop.state.rename).toBeNull();
    expect(localStorage.getItem('app_renames')).toBeNull();
  });

  test('renaming preserves file extensions', () => {
    const fileApp = {
      id: 'unit-test-file',
      title: 'Sample.txt',
      originalTitle: 'Sample.txt',
      icon: '',
      disabled: false,
      favourite: false,
      desktop_shortcut: true,
      screen: () => {},
    };
    apps.push(fileApp);
    try {
      desktop.startRename(fileApp.id);
      expect(desktop.state.rename).not.toBeNull();
      expect(desktop.state.rename?.extension).toBe('.txt');
      desktop.handleRenameChange('Example');
      desktop.commitRename();

      expect(fileApp.title).toBe('Example.txt');
      const stored = JSON.parse(localStorage.getItem('app_renames') || '{}');
      expect(stored[fileApp.id]).toBe('Example.txt');
    } finally {
      const index = apps.indexOf(fileApp);
      if (index !== -1) {
        apps.splice(index, 1);
      }
      localStorage.removeItem('app_renames');
    }
  });

  test('invalid characters show inline errors and block commit', () => {
    desktop.startRename(TARGET_ID);
    desktop.handleRenameChange('Bad/Name');
    desktop.commitRename();

    expect(desktop.state.rename).not.toBeNull();
    expect(desktop.state.rename?.error).toBeTruthy();
    expect(getTargetApp().title).toBe(originalTitle);
    expect(localStorage.getItem('app_renames')).toBeNull();

    desktop.cancelRename();
  });
});

