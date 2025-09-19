const store = new Map();

const asyncValue = (value) => Promise.resolve(value);

export const get = jest.fn((key) => asyncValue(store.get(key)));

export const set = jest.fn((key, value) => {
  store.set(key, value);
  return asyncValue(undefined);
});

export const del = jest.fn((key) => {
  store.delete(key);
  return asyncValue(undefined);
});

export const __reset = () => {
  store.clear();
};

export const __store = store;
