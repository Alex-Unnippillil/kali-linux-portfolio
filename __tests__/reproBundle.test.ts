import type { AppNotification } from '../components/common/NotificationCenter';
import type { SettingsContextValue } from '../hooks/useSettings';
import {
  REPRO_BUNDLE_VERSION,
  buildReproBundle,
  collectLocalState,
  applyReproBundle,
  type ReproBundle,
} from '../utils/dev/reproBundle';
import {
  clearRecorder,
  recordLog,
  recordStep,
  getRecorderSnapshot,
} from '../utils/dev/reproRecorder';

const createSettingsStub = (): SettingsContextValue => ({
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
});

describe('repro bundle', () => {
  beforeEach(() => {
    clearRecorder();
    localStorage.clear();
  });

  test('buildReproBundle captures sanitized snapshot', () => {
    const settings = createSettingsStub();
    const notificationsByApp: Record<string, AppNotification[]> = {
      audit: [
        {
          id: 'n-1',
          appId: 'audit',
          title: 'Alert for user@example.com',
          body: 'token=secret123456',
          timestamp: 1700000000,
          read: false,
          priority: 'high',
          hints: { source: 'qa' },
          classification: { priority: 'high', matchedRuleId: 'rule-1', source: 'rule' },
        },
      ],
    };
    localStorage.setItem(
      'desktop_icon_positions',
      JSON.stringify({ terminal: { x: 100, y: 200 } }),
    );

    recordStep('Clicked user@example.com login', { email: 'user@example.com' });
    recordLog('warn', 'Token token=abcdef123456', { secret: 'value' });

    const bundle = buildReproBundle(settings, notificationsByApp, {
      recentApps: ['terminal'],
      storage: collectLocalState(localStorage, ['desktop_icon_positions']),
    });

    expect(bundle.version).toBe(REPRO_BUNDLE_VERSION);
    expect(bundle.state.settings.accent).toBe(settings.accent);
    expect(bundle.state.local.recentApps).toEqual(['terminal']);
    expect(bundle.state.local.storage.desktop_icon_positions).toBeDefined();
    expect(bundle.state.notifications.audit[0].title).toContain('<redacted-email>');
    expect(bundle.state.notifications.audit[0].body).toContain('<redacted>');

    const snapshot = getRecorderSnapshot();
    expect(snapshot.steps[0].label).toContain('<redacted-email>');
    expect(snapshot.logs[0].message).toContain('<redacted>');
  });

  test('applyReproBundle hydrates settings, notifications, and storage', () => {
    const settings = createSettingsStub();
    const hydrateNotifications = jest.fn();
    const writeRecentApps = jest.fn();

    const bundle: ReproBundle = {
      version: REPRO_BUNDLE_VERSION,
      exportedAt: new Date().toISOString(),
      state: {
        settings: {
          accent: '#ffffff',
          wallpaper: 'wall-4',
          bgImageName: 'wall-4',
          useKaliWallpaper: true,
          density: 'compact',
          reducedMotion: true,
          fontScale: 1.25,
          highContrast: true,
          largeHitAreas: true,
          pongSpin: false,
          allowNetwork: true,
          haptics: false,
          theme: 'matrix',
        },
        notifications: {
          tools: [
            {
              id: 'log-1',
              appId: 'tools',
              title: 'Job finished',
              body: 'All good',
              timestamp: 1710000000,
              read: false,
              priority: 'normal',
              hints: { source: 'import' },
              classification: { priority: 'normal', matchedRuleId: null, source: 'default' },
            },
          ],
        },
        local: {
          recentApps: ['tools'],
          storage: {
            'desktop_icon_positions': { analyzer: { x: 10, y: 20 } },
          },
        },
      },
      steps: [
        {
          id: 'step-1',
          timestamp: 1,
          label: 'Imported run',
        },
      ],
      logs: [
        {
          id: 'log-1',
          timestamp: 2,
          level: 'info',
          message: 'Import complete',
        },
      ],
    };

    applyReproBundle(
      bundle,
      { settings, notifications: { hydrateNotifications } },
      {
        storage: localStorage,
        writeRecentApps,
      },
    );

    expect(settings.setAccent).toHaveBeenCalledWith('#ffffff');
    expect(settings.setWallpaper).toHaveBeenCalledWith('wall-4');
    expect(settings.setUseKaliWallpaper).toHaveBeenCalledWith(true);
    expect(settings.setDensity).toHaveBeenCalledWith('compact');
    expect(settings.setReducedMotion).toHaveBeenCalledWith(true);
    expect(settings.setFontScale).toHaveBeenCalledWith(1.25);
    expect(settings.setHighContrast).toHaveBeenCalledWith(true);
    expect(settings.setLargeHitAreas).toHaveBeenCalledWith(true);
    expect(settings.setPongSpin).toHaveBeenCalledWith(false);
    expect(settings.setAllowNetwork).toHaveBeenCalledWith(true);
    expect(settings.setHaptics).toHaveBeenCalledWith(false);
    expect(settings.setTheme).toHaveBeenCalledWith('matrix');
    expect(hydrateNotifications).toHaveBeenCalled();
    expect(writeRecentApps).toHaveBeenCalledWith(['tools']);
    expect(JSON.parse(localStorage.getItem('desktop_icon_positions') ?? '{}')).toEqual({
      analyzer: { x: 10, y: 20 },
    });

    const snapshot = getRecorderSnapshot();
    expect(snapshot.steps[0].label).toBe('Imported run');
    expect(snapshot.logs[0].message).toBe('Import complete');
  });
});
