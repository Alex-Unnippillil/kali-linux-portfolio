import { openDB } from 'idb';
import { get, set } from 'idb-keyval';
import {
  BackupError,
  InvalidPassphraseError,
  createEncryptedBackup,
  restoreFromBackup,
} from '../utils/backup';

describe('backup utilities', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    const db = await openDB('keyval-store', undefined, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('keyval')) {
          database.createObjectStore('keyval');
        }
      },
    });
    await db.clear('keyval');
    db.close();
  });

  it('preserves localStorage and IndexedDB data through backup and restore', async () => {
    window.localStorage.setItem('kali-theme', 'neon');
    await set('progress', { stage: 3 });
    await set('keybinds', { jump: 'Space' });

    const backup = await createEncryptedBackup('strong-passphrase');

    window.localStorage.setItem('kali-theme', 'dark');
    window.localStorage.setItem('extra', 'keep');
    const db = await openDB('keyval-store');
    const tx = db.transaction('keyval', 'readwrite');
    await tx.store.clear();
    await tx.done;
    db.close();

    await restoreFromBackup(backup, 'strong-passphrase', { mode: 'replace' });

    expect(window.localStorage.getItem('kali-theme')).toBe('neon');
    expect(window.localStorage.getItem('extra')).toBeNull();
    await expect(get('progress')).resolves.toEqual({ stage: 3 });
    await expect(get('keybinds')).resolves.toEqual({ jump: 'Space' });
  });

  it('rejects invalid passphrases with a specific error type', async () => {
    window.localStorage.setItem('demo', 'value');
    const backup = await createEncryptedBackup('secret');

    await expect(restoreFromBackup(backup, 'wrong')).rejects.toBeInstanceOf(InvalidPassphraseError);
  });

  it('fails gracefully for malformed archives', async () => {
    const corrupted = new Uint8Array([0, 1, 2, 3, 4, 5]);
    await expect(restoreFromBackup(corrupted, 'secret')).rejects.toBeInstanceOf(BackupError);
  });
});

