import {
  clearPermissionPreference,
  getPermissionPreference,
  recordPermissionDecision,
  shouldPromptPermission,
  DISMISS_SNOOZE_MS,
} from '../utils/permissionPreferences';
import type { PermissionType } from '../types/permissions';

describe('permissionPreferences', () => {
  const permission: PermissionType = 'notifications';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('stores remembered grants and skips future prompts', () => {
    recordPermissionDecision(permission, 'granted', true);
    const pref = getPermissionPreference(permission);
    expect(pref).toEqual(
      expect.objectContaining({ decision: 'granted', remember: true }),
    );
    expect(shouldPromptPermission(permission)).toBe(false);
  });

  it('removes transient allow decisions when not remembered', () => {
    recordPermissionDecision(permission, 'granted', false);
    expect(getPermissionPreference(permission)).toBeNull();
    expect(shouldPromptPermission(permission)).toBe(true);
  });

  it('snoozes dismissed prompts then allows them after the window', () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1000);
    recordPermissionDecision(permission, 'denied', false);

    expect(shouldPromptPermission(permission)).toBe(false);

    nowSpy.mockReturnValue(1000 + DISMISS_SNOOZE_MS + 1);
    expect(shouldPromptPermission(permission)).toBe(true);
    clearPermissionPreference(permission);
  });

  it('respects remembered denials indefinitely', () => {
    recordPermissionDecision(permission, 'denied', true);
    expect(shouldPromptPermission(permission)).toBe(false);
  });
});
