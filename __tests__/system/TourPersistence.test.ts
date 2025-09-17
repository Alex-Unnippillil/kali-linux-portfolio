import {
  clearTourCompletion,
  createTourPersistence,
  persistTourCompletion,
  readTourCompletion,
} from "../../components/system/Tour";

describe("createTourPersistence", () => {
  const createMockStorage = () => {
    const store: Record<string, string> = {};

    return {
      getItem: jest.fn((key: string) => (key in store ? store[key] : null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
    };
  };

  it("reads as incomplete when no state has been stored", () => {
    const storage = createMockStorage();
    const persistence = createTourPersistence("test-tour", storage);

    expect(persistence.available).toBe(true);
    expect(persistence.read()).toBe(false);
    expect(storage.getItem).toHaveBeenCalledWith("test-tour");
  });

  it("persists completion and avoids duplicate writes", () => {
    const storage = createMockStorage();
    const persistence = createTourPersistence("tour", storage);

    persistence.write(true);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenLastCalledWith("tour", "1");
    expect(persistence.read()).toBe(true);

    persistence.write(true);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it("removes the stored value when asked to clear", () => {
    const storage = createMockStorage();
    const persistence = createTourPersistence("tour", storage);

    persistence.write(true);
    persistence.clear();

    expect(storage.removeItem).toHaveBeenCalledWith("tour");
    expect(persistence.read()).toBe(false);
  });

  it("is safe to call when storage is unavailable", () => {
    const persistence = createTourPersistence("tour", null);

    expect(persistence.available).toBe(false);
    expect(persistence.read()).toBe(false);
    expect(() => persistence.write(true)).not.toThrow();
    expect(() => persistence.write(false)).not.toThrow();
    expect(() => persistence.clear()).not.toThrow();
  });

  it("handles underlying storage errors gracefully", () => {
    const storage = {
      getItem: jest.fn(() => {
        throw new Error("blocked");
      }),
      setItem: jest.fn(() => {
        throw new Error("blocked");
      }),
      removeItem: jest.fn(() => {
        throw new Error("blocked");
      }),
    };

    const persistence = createTourPersistence("tour", storage);

    expect(persistence.read()).toBe(false);
    expect(() => persistence.write(true)).not.toThrow();
    expect(() => persistence.write(false)).not.toThrow();
    expect(() => persistence.clear()).not.toThrow();
  });
});

describe("default tour persistence helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    clearTourCompletion();
  });

  it("integrates with the browser localStorage", () => {
    expect(readTourCompletion()).toBe(false);
    persistTourCompletion(true);
    expect(readTourCompletion()).toBe(true);
    clearTourCompletion();
    expect(readTourCompletion()).toBe(false);
  });

  it("avoids duplicate writes to localStorage", () => {
    const spy = jest.spyOn(Storage.prototype, "setItem");

    persistTourCompletion(true);
    persistTourCompletion(true);

    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});
