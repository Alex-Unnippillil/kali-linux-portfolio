import { getSimpleExplanations, setSimpleExplanations } from '../utils/settingsStore';

describe('simple explanations setting', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('defaults to false', async () => {
    expect(await getSimpleExplanations()).toBe(false);
  });

  test('persists value', async () => {
    await setSimpleExplanations(true);
    expect(await getSimpleExplanations()).toBe(true);
  });
});
