import CrossfadePlayer from '../apps/spotify/utils/crossfade';

type FetchMock = jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

class MockAudioParam {
  value = 0;
  setValueAtTime = jest.fn((value: number) => {
    this.value = value;
  });
  linearRampToValueAtTime = jest.fn();
  cancelScheduledValues = jest.fn();
}

class MockGainNode {
  gain = new MockAudioParam();
  connect = jest.fn();
}

class MockAnalyserNode {
  fftSize = 0;
  connect = jest.fn();
}

class MockBufferSourceNode {
  buffer: AudioBuffer | null = null;
  connect = jest.fn();
  start = jest.fn();
  stop = jest.fn();
  onended: (() => void) | null = null;
}

class MockAudioContext {
  currentTime = 0;
  destination = {};
  decodeAudioData = jest.fn(async (arr: ArrayBuffer) => ({
    duration: currentDurations[lastFetchedUrl] ?? 10,
  }) as unknown as AudioBuffer);
  createGain = jest.fn(() => new MockGainNode());
  createAnalyser = jest.fn(() => new MockAnalyserNode());
  createBufferSource = jest.fn(() => new MockBufferSourceNode());
  suspend = jest.fn();
  resume = jest.fn();
  close = jest.fn(async () => undefined);
}

type BufferSource = ReturnType<MockAudioContext['createBufferSource']>;

const originalFetch = global.fetch;

const currentDurations: Record<string, number> = {
  '/track-a.mp3': 12,
  '/track-b.mp3': 18,
};

let lastFetchedUrl = '';

describe('CrossfadePlayer gapless scheduling', () => {
  let ctx: MockAudioContext;
  let fetchMock: FetchMock;

  beforeEach(() => {
    lastFetchedUrl = '';
    ctx = new MockAudioContext();
    const ctor = jest.fn(() => ctx as unknown as AudioContext) as unknown as typeof AudioContext;
    (window as typeof window & { AudioContext?: typeof AudioContext }).AudioContext = ctor;
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext = undefined;

    fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      lastFetchedUrl = input.toString();
      return {
        arrayBuffer: async () => new ArrayBuffer(8),
      } as unknown as Response;
    }) as FetchMock;
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (originalFetch) {
      global.fetch = originalFetch;
    }
    delete (window as typeof window & { AudioContext?: typeof AudioContext }).AudioContext;
  });

  it('starts playback immediately when gapless is disabled', async () => {
    const player = new CrossfadePlayer();

    await player.play('/track-a.mp3', 0, 0, { gapless: false });

    const firstSource = ctx.createBufferSource.mock.results[0].value as BufferSource;
    expect(firstSource.start).toHaveBeenCalledWith(0, 0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('aligns the next track with the current fade window when gapless is enabled', async () => {
    const player = new CrossfadePlayer();

    await player.play('/track-a.mp3', 0, 0, { gapless: false });
    ctx.currentTime = 9;

    await player.play('/track-b.mp3', 3, 0, { gapless: true });

    const secondSource = ctx.createBufferSource.mock.results[1].value as BufferSource;
    expect(secondSource.start).toHaveBeenCalledWith(9, 0);

    const firstSource = ctx.createBufferSource.mock.results[0].value as BufferSource;
    expect(firstSource.stop).toHaveBeenCalledWith(12);
  });

  it('reuses preloaded buffers for subsequent gapless transitions', async () => {
    const player = new CrossfadePlayer();

    await player.preload('/track-a.mp3');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await player.play('/track-a.mp3', 0, 0, { gapless: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
