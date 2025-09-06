import { exportBackupZip, parseBackupZip, applyBackup } from '../utils/backup';
import { importPanel, exportPanel } from '../utils/settingsStore';
import { setTheme, getTheme } from '../utils/theme';

// helper to create panel layout
async function setPanel(pinned: string[], size: number) {
  await importPanel({ pinnedApps: pinned, panelSize: size });
}

test('round-trip export/import restores theme and panel', async () => {
  setTheme('neon');
  await setPanel(['a', 'b'], 42);

  const blob = await exportBackupZip();

  setTheme('dark');
  await setPanel(['x'], 16);

  expect(getTheme()).toBe('dark');
  let panel = JSON.parse(await exportPanel());
  expect(panel.pinnedApps).toEqual(['x']);
  expect(panel.panelSize).toBe(16);

  const data = await parseBackupZip(blob);
  await applyBackup(data);

  expect(getTheme()).toBe('neon');
  panel = JSON.parse(await exportPanel());
  expect(panel.pinnedApps).toEqual(['a', 'b']);
  expect(panel.panelSize).toBe(42);
});
