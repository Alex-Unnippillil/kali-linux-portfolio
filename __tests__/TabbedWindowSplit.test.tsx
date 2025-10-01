import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TabbedWindow, { TabDefinition } from '../components/ui/TabbedWindow';
import { SettingsContext } from '../hooks/useSettings';

type SettingsValue = React.ContextType<typeof SettingsContext>;

const createSettingsValue = (overrides: Partial<SettingsValue> = {}): SettingsValue => ({
  accent: '#1793d1',
  wallpaper: 'wall-2',
  bgImageName: 'wall-2',
  useKaliWallpaper: false,
  density: 'regular',
  reducedMotion: false,
  fontScale: 1,
  highContrast: false,
  largeHitAreas: false,
  pongSpin: true,
  allowNetwork: false,
  haptics: true,
  theme: 'default',
  setAccent: jest.fn(),
  setWallpaper: jest.fn(),
  setUseKaliWallpaper: jest.fn(),
  setDensity: jest.fn(),
  setReducedMotion: jest.fn(),
  setFontScale: jest.fn(),
  setHighContrast: jest.fn(),
  setLargeHitAreas: jest.fn(),
  setPongSpin: jest.fn(),
  setAllowNetwork: jest.fn(),
  setHaptics: jest.fn(),
  setTheme: jest.fn(),
  ...overrides,
});

const renderTabbedWindow = (tabs: TabDefinition[], settings?: Partial<SettingsValue>) =>
  render(
    <SettingsContext.Provider value={createSettingsValue(settings)}>
      <TabbedWindow initialTabs={tabs} />
    </SettingsContext.Provider>,
  );

let scrollToSpy: jest.SpyInstance | null = null;

beforeAll(() => {
  if (!HTMLElement.prototype.scrollTo) {
    HTMLElement.prototype.scrollTo = function scrollTo(this: HTMLElement, options?: any) {
      if (typeof options === 'number') {
        this.scrollTop = options;
        return;
      }
      if (options) {
        if (typeof options.top === 'number') this.scrollTop = options.top;
        if (typeof options.left === 'number') this.scrollLeft = options.left;
      }
    };
  }
});

beforeEach(() => {
  scrollToSpy = jest
    .spyOn(HTMLElement.prototype, 'scrollTo')
    .mockImplementation(function mockScrollTo(this: HTMLElement, options?: any) {
      if (typeof options === 'number') {
        this.scrollTop = options;
        return;
      }
      if (options) {
        if (typeof options.top === 'number') this.scrollTop = options.top;
        if (typeof options.left === 'number') this.scrollLeft = options.left;
      }
    });
  window.localStorage.clear();
});

afterEach(() => {
  scrollToSpy?.mockRestore();
  scrollToSpy = null;
  window.localStorage.clear();
});

describe('TabbedWindow split panes', () => {
  it('allows resizing split panes with keyboard controls', () => {
    const tabs: TabDefinition[] = [
      {
        id: 'alpha',
        title: 'Alpha',
        content: <div style={{ height: 800 }}>Alpha content</div>,
      },
    ];

    renderTabbedWindow(tabs);

    fireEvent.click(screen.getByRole('button', { name: /split view/i }));

    const separator = screen.getByRole('separator', { name: /resize split panes/i });
    const firstPane = screen.getByLabelText('Alpha pane 1') as HTMLDivElement;

    expect(parseFloat(firstPane.style.flexBasis)).toBeCloseTo(50, 1);

    fireEvent.keyDown(separator, { key: 'ArrowRight' });

    expect(parseFloat(firstPane.style.flexBasis)).toBeGreaterThan(50);
  });

  it('persists split layout and orientation per tab', () => {
    const tabs: TabDefinition[] = [
      { id: 'alpha', title: 'Alpha', content: <div>Alpha</div> },
      { id: 'beta', title: 'Beta', content: <div>Beta</div> },
    ];

    const utils = renderTabbedWindow(tabs);

    const splitButton = screen.getByRole('button', { name: /split view/i });
    fireEvent.click(splitButton);

    const orientationButton = screen.getByRole('button', { name: /toggle split orientation/i });
    fireEvent.click(orientationButton);

    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'horizontal');

    fireEvent.click(screen.getByRole('tab', { name: /beta/i }));
    expect(splitButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('tab', { name: /alpha/i }));
    expect(splitButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'horizontal');

    utils.unmount();

    renderTabbedWindow(tabs);
    expect(screen.getByRole('button', { name: /split view/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('links pane scroll positions when enabled', async () => {
    const tallContent = (
      <div>
        {Array.from({ length: 200 }).map((_, index) => (
          <p key={index}>Line {index}</p>
        ))}
      </div>
    );
    const tabs: TabDefinition[] = [
      {
        id: 'scroll',
        title: 'Scroll',
        content: () => tallContent,
      },
    ];

    renderTabbedWindow(tabs);

    fireEvent.click(screen.getByRole('button', { name: /split view/i }));
    const linkButton = screen.getByRole('button', { name: /link pane scrolling/i });
    fireEvent.click(linkButton);

    await act(async () => {});

    const firstPane = screen.getByLabelText('Scroll pane 1') as HTMLDivElement;
    const secondPane = screen.getByLabelText('Scroll pane 2') as HTMLDivElement;

    firstPane.scrollTop = 120;
    fireEvent.scroll(firstPane);

    await act(async () => {});

    expect(secondPane.scrollTop).toBe(120);
    expect(scrollToSpy).toHaveBeenCalledWith(
      expect.objectContaining({ top: 120, behavior: 'smooth' }),
    );
  });

  it('uses instant scroll syncing when reduced motion is enabled', async () => {
    const tabs: TabDefinition[] = [
      { id: 'motion', title: 'Motion', content: () => <div style={{ height: 1200 }}>Motion</div> },
    ];

    renderTabbedWindow(tabs, { reducedMotion: true });

    fireEvent.click(screen.getByRole('button', { name: /split view/i }));
    const linkButton = screen.getByRole('button', { name: /link pane scrolling/i });
    fireEvent.click(linkButton);

    await act(async () => {});

    const firstPane = screen.getByLabelText('Motion pane 1') as HTMLDivElement;

    firstPane.scrollTop = 75;
    fireEvent.scroll(firstPane);

    await act(async () => {});

    expect(scrollToSpy).toHaveBeenCalledWith(
      expect.objectContaining({ top: 75, behavior: 'auto' }),
    );
  });
});
