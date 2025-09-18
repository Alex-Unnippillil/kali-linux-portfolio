import {
  SftpEntry,
  SftpSnapshot,
  createSftpAdapter,
} from '../../../apps/ssh/mocks/sftpAdapter';
import localSeed from '../../../data/ssh/sftp/local.json';
import remoteSeed from '../../../data/ssh/sftp/remote.json';

type Pane = 'local' | 'remote';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const findEntry = (entries: SftpEntry[], path: string[]): SftpEntry | null => {
  if (path.length === 0) return null;
  let currentEntries = entries;
  let current: SftpEntry | undefined;
  for (let i = 0; i < path.length; i += 1) {
    current = currentEntries.find((entry) => entry.name === path[i]);
    if (!current) return null;
    if (i < path.length - 1) {
      if (current.type !== 'directory' || !current.children) return null;
      currentEntries = current.children;
    }
  }
  return current ?? null;
};

const getLatest = (updates: SftpSnapshot[]) => updates[updates.length - 1];

const createAdapter = () =>
  createSftpAdapter(clone(localSeed as SftpEntry[]), clone(remoteSeed as SftpEntry[]));

describe('SFTP adapter', () => {
  it('copies files from local to remote and notifies listeners', () => {
    const adapter = createAdapter();
    const updates: SftpSnapshot[] = [];
    const unsubscribe = adapter.subscribe((snapshot) => updates.push(snapshot));

    const result = adapter.copy({
      from: 'local',
      to: 'remote',
      path: ['notes.txt'],
      targetPath: [],
    });

    expect(result.success).toBe(true);
    const latest = getLatest(updates);
    expect(findEntry(latest.remote, ['notes.txt'])).not.toBeNull();
    expect(findEntry(latest.local, ['notes.txt'])).not.toBeNull();

    unsubscribe();
  });

  it('moves files between panes and removes the original entry', () => {
    const adapter = createAdapter();
    const updates: SftpSnapshot[] = [];
    const unsubscribe = adapter.subscribe((snapshot) => updates.push(snapshot));

    const result = adapter.move({
      from: 'remote',
      to: 'local',
      path: ['motd.txt'],
      targetPath: [],
    });

    expect(result.success).toBe(true);
    const latest = getLatest(updates);
    expect(findEntry(latest.local, ['motd.txt'])).not.toBeNull();
    expect(findEntry(latest.remote, ['motd.txt'])).toBeNull();

    unsubscribe();
  });

  it('deletes files from a pane and emits an updated snapshot', () => {
    const adapter = createAdapter();
    const updates: SftpSnapshot[] = [];
    const unsubscribe = adapter.subscribe((snapshot) => updates.push(snapshot));

    const result = adapter.delete({ side: 'local', path: ['inventory.csv'] });

    expect(result.success).toBe(true);
    const latest = getLatest(updates);
    expect(findEntry(latest.local, ['inventory.csv'])).toBeNull();

    unsubscribe();
  });

  it('prevents directory operations for copy, move, and delete', () => {
    const adapter = createAdapter();
    const directories: Record<Pane, string[]> = {
      local: ['Documents'],
      remote: ['reports'],
    };

    const copyDir = adapter.copy({ from: 'local', to: 'remote', path: directories.local });
    const moveDir = adapter.move({ from: 'remote', to: 'local', path: directories.remote });
    const deleteDir = adapter.delete({ side: 'local', path: directories.local });

    expect(copyDir.success).toBe(false);
    expect(moveDir.success).toBe(false);
    expect(deleteDir.success).toBe(false);
  });
});
