import {
  SNAPSHOT_CAPTURE_EVENT,
  SNAPSHOT_RESTORE_EVENT,
  AppSnapshot,
  applySnapshotToNode,
  buildSnapshotRecord,
  captureSnapshotFromNode,
  clearAllSnapshots,
  deleteSnapshotForApp,
  getSnapshotsForApp,
  saveSnapshotForApp,
} from '../utils/appSnapshots';

describe('appSnapshots', () => {
  beforeEach(() => {
    clearAllSnapshots();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('captures inputs and restores state', () => {
    document.body.innerHTML = `
      <div id="window">
        <div class="windowMainScreen">
          <form>
            <input type="text" name="username" value="alice" />
            <textarea id="bio">notes</textarea>
            <input type="checkbox" name="notify" checked />
            <select name="role">
              <option value="analyst" selected>Analyst</option>
              <option value="engineer">Engineer</option>
            </select>
            <label>
              <input type="radio" name="mode" value="passive" /> Passive
            </label>
            <label>
              <input type="radio" name="mode" value="active" checked /> Active
            </label>
            <output data-snapshot-result="summary">Initial summary</output>
          </form>
        </div>
      </div>
    `;

    const node = document.getElementById('window') as HTMLElement;

    node.addEventListener(SNAPSHOT_CAPTURE_EVENT, (event: Event) => {
      const detail = (event as CustomEvent).detail;
      detail.provide({
        payload: { stage: 'alpha' },
        results: [{ key: 'custom', value: 'extra' }],
      });
    });

    const data = captureSnapshotFromNode(node);
    expect(data.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'username', kind: 'text', value: 'alice' }),
        expect.objectContaining({ key: 'bio', kind: 'textarea', value: 'notes' }),
        expect.objectContaining({ key: 'notify', kind: 'checkbox', value: true }),
        expect.objectContaining({ key: 'role', kind: 'select', value: 'analyst' }),
        expect.objectContaining({ key: 'mode', kind: 'radio', value: 'active' }),
      ]),
    );
    expect(data.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'summary', value: 'Initial summary' }),
        expect.objectContaining({ key: 'custom', value: 'extra' }),
      ]),
    );
    expect(data.payload).toEqual({ stage: 'alpha' });

    const snapshot = buildSnapshotRecord({
      appId: 'demo-app',
      name: 'Initial capture',
      data,
    });
    saveSnapshotForApp('demo-app', snapshot);
    const stored = getSnapshotsForApp('demo-app');
    expect(stored).toHaveLength(1);

    const username = node.querySelector('input[name="username"]') as HTMLInputElement;
    const bio = node.querySelector('#bio') as HTMLTextAreaElement;
    const notify = node.querySelector('input[name="notify"]') as HTMLInputElement;
    const role = node.querySelector('select[name="role"]') as HTMLSelectElement;
    const active = node.querySelector(
      'input[type="radio"][name="mode"][value="active"]',
    ) as HTMLInputElement;
    const passive = node.querySelector(
      'input[type="radio"][name="mode"][value="passive"]',
    ) as HTMLInputElement;
    const summary = node.querySelector('[data-snapshot-result="summary"]') as HTMLElement;

    username.value = '';
    bio.value = '';
    notify.checked = false;
    role.value = 'engineer';
    active.checked = false;
    passive.checked = true;
    summary.textContent = 'Changed';

    const restoreListener = jest.fn();
    node.addEventListener(SNAPSHOT_RESTORE_EVENT, (event: Event) => {
      const detail = (event as CustomEvent<AppSnapshot>).detail;
      restoreListener(detail.snapshot);
    });

    applySnapshotToNode(node, stored[0]);

    expect(username.value).toBe('alice');
    expect(bio.value).toBe('notes');
    expect(notify.checked).toBe(true);
    expect(role.value).toBe('analyst');
    expect(active.checked).toBe(true);
    expect(passive.checked).toBe(false);
    expect(summary.textContent).toBe('Initial summary');

    expect(restoreListener).toHaveBeenCalledTimes(1);
    expect(restoreListener).toHaveBeenCalledWith(expect.objectContaining({ id: snapshot.id }));
  });

  it('removes snapshots when deleted', () => {
    const baseNode = document.createElement('div');
    baseNode.innerHTML = '<div class="windowMainScreen"></div>';
    document.body.appendChild(baseNode);

    const first = buildSnapshotRecord({
      appId: 'demo-app',
      name: 'First',
      data: captureSnapshotFromNode(baseNode),
    });
    const second = buildSnapshotRecord({
      appId: 'demo-app',
      name: 'Second',
      data: captureSnapshotFromNode(baseNode),
    });

    saveSnapshotForApp('demo-app', first);
    saveSnapshotForApp('demo-app', second);
    expect(getSnapshotsForApp('demo-app')).toHaveLength(2);

    const afterDelete = deleteSnapshotForApp('demo-app', first.id);
    expect(afterDelete).toHaveLength(1);
    expect(afterDelete[0].id).toBe(second.id);

    const cleared = deleteSnapshotForApp('demo-app', second.id);
    expect(cleared).toHaveLength(0);
    expect(getSnapshotsForApp('demo-app')).toHaveLength(0);
  });
});
