jest.mock('../utils/env', () => ({
  isBrowser: true,
}));

jest.mock('../utils/safeIDB', () => ({
  getDb: jest.fn(),
}));

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Sticky Notes app', () => {
  let getDbMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    document.body.innerHTML =
      '<button id="add-note">Add Note</button><div id="notes"></div>';
    localStorage.clear();
    ({ getDb: getDbMock } = require('../utils/safeIDB'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('persists notes to IndexedDB when available', async () => {
    const putMock = jest.fn(async (note) => note);
    const clearMock = jest.fn(async () => undefined);
    const transactionMock = jest.fn(() => ({
      store: {
        clear: clearMock,
        put: putMock,
      },
      done: Promise.resolve(),
    }));
    const getAllMock = jest.fn(async () => []);

    getDbMock.mockReturnValue(
      Promise.resolve({
        transaction: transactionMock,
        getAll: getAllMock,
      }),
    );

    await import('../apps/sticky_notes/main');
    await flushPromises();

    const addButton = document.getElementById('add-note');
    addButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await flushPromises();
    await flushPromises();

    expect(transactionMock).toHaveBeenCalledWith('notes', 'readwrite');
    expect(clearMock).toHaveBeenCalled();
    expect(putMock).toHaveBeenCalled();
    const savedNote = putMock.mock.calls[0][0];
    expect(savedNote).toMatchObject({ content: '', zIndex: expect.any(Number) });
  });

  it('falls back to localStorage persistence when IndexedDB is unavailable', async () => {
    getDbMock.mockReturnValue(null);
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    await import('../apps/sticky_notes/main');
    await flushPromises();

    const addButton = document.getElementById('add-note');
    addButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await flushPromises();

    expect(setItemSpy).toHaveBeenCalled();
    const payload = JSON.parse(setItemSpy.mock.calls[0][1]);
    expect(Array.isArray(payload)).toBe(true);
    expect(payload[0]).toMatchObject({ content: '' });
    setItemSpy.mockRestore();
  });

  it('updates note position and z-index when dragged via handle', async () => {
    const putMock = jest.fn(async (note) => note);
    const clearMock = jest.fn(async () => undefined);
    const transactionMock = jest.fn(() => ({
      store: {
        clear: clearMock,
        put: putMock,
      },
      done: Promise.resolve(),
    }));
    const seededNote = {
      id: 1,
      content: 'Seed',
      x: 10,
      y: 20,
      color: '#ffffff',
      width: 200,
      height: 200,
      zIndex: 1,
    };

    getDbMock.mockReturnValue(
      Promise.resolve({
        transaction: transactionMock,
        getAll: jest.fn(async () => [seededNote]),
      }),
    );

    await import('../apps/sticky_notes/main');
    await flushPromises();

    const note = document.querySelector('.note') as HTMLElement | null;
    const handle = note?.querySelector('.note-handle') as HTMLElement | null;
    expect(note).toBeTruthy();
    expect(handle).toBeTruthy();

    handle?.dispatchEvent(
      new MouseEvent('mousedown', {
        clientX: 30,
        clientY: 40,
        bubbles: true,
      }),
    );

    document.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: 80,
        clientY: 120,
        bubbles: true,
      }),
    );

    document.dispatchEvent(
      new MouseEvent('mouseup', {
        clientX: 80,
        clientY: 120,
        bubbles: true,
      }),
    );

    await flushPromises();
    await flushPromises();

    expect(note?.style.left).toBe('60px');
    expect(note?.style.top).toBe('100px');
    expect(note?.classList.contains('note-active')).toBe(true);
    expect(
      putMock.mock.calls.some(([call]) => call.x === 60 && call.y === 100),
    ).toBe(true);
    expect(note?.style.zIndex).not.toBe('1');
  });
});
