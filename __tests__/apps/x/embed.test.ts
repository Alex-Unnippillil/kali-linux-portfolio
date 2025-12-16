import { EMBED_SCRIPT_SRC, loadEmbedScript } from '../../../apps/x/embed';

describe('X embed loader', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
    // Ensure a clean slate in case other tests set this global.
    delete (window as any).twttr;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves null when the embed script fails to load', async () => {
    const promise = loadEmbedScript(10_000);

    const script = document.querySelector(
      `script[src="${EMBED_SCRIPT_SRC}"]`,
    ) as HTMLScriptElement | null;

    expect(script).not.toBeNull();
    script?.dispatchEvent(new Event('error'));

    await expect(promise).resolves.toBeNull();
  });

  it('resolves null when the embed script times out', async () => {
    const promise = loadEmbedScript(123);

    jest.advanceTimersByTime(124);

    await expect(promise).resolves.toBeNull();
  });
});


