const store = new Map();

const api = {
  __store: store,
  __reset: () => store.clear(),
  get: jest.fn(async (key) => store.get(key)),
  set: jest.fn(async (key, value) => {
    store.set(key, value);
  }),
  del: jest.fn(async (key) => {
    store.delete(key);
  }),
  update: jest.fn(async (key, updater) => {
    const value = store.get(key);
    const next = await updater(value);
    store.set(key, next);
    return next;
  }),
  keys: jest.fn(async () => Array.from(store.keys())),
  clear: jest.fn(async () => {
    store.clear();
  }),
};

module.exports = api;
