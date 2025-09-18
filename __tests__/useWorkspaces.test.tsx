import { renderHook, act } from '@testing-library/react';
import useWorkspaces from '../hooks/useWorkspaces';
import logger from '../utils/logger';

describe('useWorkspaces', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it('creates a new workspace and sets it active', () => {
    const { result } = renderHook(() => useWorkspaces());

    act(() => {
      const outcome = result.current.createWorkspace('Red Team');
      expect(outcome.success).toBe(true);
      expect(outcome.profile?.name).toBe('Red Team');
    });

    const names = result.current.profiles.map((profile) => profile.name);
    expect(names).toContain('Red Team');
    expect(result.current.activeProfile.name).toBe('Red Team');
  });

  it('switches the active workspace', () => {
    const { result } = renderHook(() => useWorkspaces());

    act(() => {
      result.current.createWorkspace('Blue Team');
    });

    const defaultId = result.current.profiles.find(
      (profile) => profile.name === 'Default Workspace',
    )!.id;

    act(() => {
      result.current.switchWorkspace(defaultId);
    });

    expect(result.current.activeProfile.id).toBe(defaultId);
  });

  it('exports workspace data including active workspace', () => {
    const { result } = renderHook(() => useWorkspaces());

    act(() => {
      const outcome = result.current.createWorkspace('Recon');
      expect(outcome.success).toBe(true);
      result.current.setApps(['terminal', 'wireshark']);
    });

    const exported = result.current.exportWorkspaces();
    const parsed = JSON.parse(exported);

    expect(parsed).toEqual({
      version: 1,
      activeId: result.current.activeId,
      profiles: result.current.profiles.map(({ id, name, apps }) => ({ id, name, apps })),
    });
  });

  it('imports workspaces from exported data', () => {
    const sourceHook = renderHook(() => useWorkspaces());

    act(() => {
      const outcome = sourceHook.result.current.createWorkspace('Forensics');
      expect(outcome.success).toBe(true);
    });

    act(() => {
      sourceHook.result.current.setApps(['autopsy', 'volatility']);
    });

    const exported = sourceHook.result.current.exportWorkspaces();
    const parsed = JSON.parse(exported);
    const exportedForensics = parsed.profiles.find(
      (profile: { name: string }) => profile.name === 'Forensics',
    );
    expect(exportedForensics?.apps).toEqual(['autopsy', 'volatility']);

    window.localStorage.clear();
    jest.restoreAllMocks();

    const { result } = renderHook(() => useWorkspaces());

    let outcome;
    act(() => {
      outcome = result.current.importWorkspaces(exported);
    });

    expect(outcome.success).toBe(true);
    expect(outcome.imported).toBeGreaterThan(0);

    const names = result.current.profiles.map((profile) => profile.name);
    expect(names).toContain('Forensics');

    const importedForensics = result.current.profiles.find(
      (profile) => profile.name === 'Forensics',
    );
    expect(importedForensics?.apps).toEqual(['autopsy', 'volatility']);
    expect(result.current.activeProfile.name).toBe('Forensics');
    expect(result.current.activeProfile.apps).toEqual(['autopsy', 'volatility']);
  });

  it('renames imported workspaces that conflict with existing ones', () => {
    const { result } = renderHook(() => useWorkspaces());

    act(() => {
      result.current.createWorkspace('Alpha');
    });

    const payload = JSON.stringify({
      version: 1,
      activeId: 'alpha-external',
      profiles: [
        { id: 'alpha-external', name: 'Alpha', apps: ['terminal'] },
        { id: 'bravo-external', name: 'Bravo', apps: ['chrome'] },
      ],
    });

    act(() => {
      const outcome = result.current.importWorkspaces(payload);
      expect(outcome.success).toBe(true);
      expect(outcome.conflicts).toEqual([
        { original: 'Alpha', resolved: 'Alpha (Imported)' },
      ]);
      expect(outcome.imported).toBe(2);
    });

    const names = result.current.profiles.map((profile) => profile.name);
    expect(names).toContain('Alpha');
    expect(names).toContain('Alpha (Imported)');
    expect(names).toContain('Bravo');
  });

  it('logs and reports an error when import fails', () => {
    const spy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useWorkspaces());

    act(() => {
      const outcome = result.current.importWorkspaces('not-json');
      expect(outcome.success).toBe(false);
      expect(outcome.imported).toBe(0);
    });

    expect(spy).toHaveBeenCalled();
  });
});
