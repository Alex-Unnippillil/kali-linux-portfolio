import WebAudioManager, { AudioTrack } from "../../../apps/spotify/utils/audioEngine";

class MockGainNode {
  gain = {
    value: 1,
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    cancelScheduledValues: jest.fn(),
  };

  connect = jest.fn();
}

class MockAnalyserNode {
  fftSize = 0;
  connect = jest.fn();
}

class MockAudioBuffer {
  constructor(public duration: number) {}
}

class MockAudioBufferSourceNode {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  connect = jest.fn();
  start = jest.fn();
  stop = jest.fn();
}

class MockAudioContext {
  currentTime = 0;
  state: AudioContextState = "running";
  destination = {} as AudioDestinationNode;
  createdSources: MockAudioBufferSourceNode[] = [];
  createdGains: MockGainNode[] = [];
  createdAnalysers: MockAnalyserNode[] = [];

  constructor(private durations: Map<string, number>) {}

  createGain() {
    const gain = new MockGainNode();
    this.createdGains.push(gain);
    return gain as unknown as GainNode;
  }

  createAnalyser() {
    const analyser = new MockAnalyserNode();
    this.createdAnalysers.push(analyser);
    return analyser as unknown as AnalyserNode;
  }

  createBufferSource() {
    const source = new MockAudioBufferSourceNode();
    this.createdSources.push(source);
    return source as unknown as AudioBufferSourceNode;
  }

  decodeAudioData = jest.fn(async (data: ArrayBuffer) => {
    const url = new TextDecoder().decode(new Uint8Array(data));
    const duration = this.durations.get(url) ?? 30;
    return new MockAudioBuffer(duration) as unknown as AudioBuffer;
  });

  suspend = jest.fn(async () => {
    this.state = "suspended";
  });

  resume = jest.fn(async () => {
    this.state = "running";
  });

  close = jest.fn(async () => {
    this.state = "closed" as AudioContextState;
  });
}

const encodeUrl = (url: string) => new TextEncoder().encode(url).buffer;

const flushPromises = async () => {
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

describe("WebAudioManager crossfade", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("queues the next track with a crossfade overlap", async () => {
    jest.useFakeTimers();
    const durations = new Map<string, number>([
      ["track-a", 20],
      ["track-b", 25],
    ]);
    const context = new MockAudioContext(durations);
    const advance = jest.fn();
    const player = new WebAudioManager({
      crossfade: 3,
      gapless: true,
      onAdvance: advance,
      createContext: () => context as unknown as AudioContext,
      fetcher: async (url) => encodeUrl(url),
    });

    const queue: AudioTrack[] = [
      { url: "track-a", title: "A" },
      { url: "track-b", title: "B" },
    ];
    player.setQueue(queue);

    await player.play(0);
    await flushPromises();

    expect(context.createdSources.length).toBeGreaterThan(1);
    const nextSource = context.createdSources[1];
    expect(nextSource.start).toHaveBeenCalledWith(17);

    const nextGain = context.createdGains[0].gain;
    expect(nextGain.setValueAtTime).toHaveBeenCalledWith(0, 17);
    expect(nextGain.linearRampToValueAtTime).toHaveBeenCalledWith(1, 20);

    const currentGain = context.createdGains[1].gain;
    expect(currentGain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 20);

    jest.advanceTimersByTime(17000);
    await flushPromises();
    expect(advance).toHaveBeenCalledWith(1);
  });

  it("keeps a minimal overlap when the crossfade slider is zero", async () => {
    jest.useFakeTimers();
    const durations = new Map<string, number>([
      ["track-a", 10],
      ["track-b", 12],
    ]);
    const context = new MockAudioContext(durations);
    const player = new WebAudioManager({
      crossfade: 0,
      gapless: true,
      createContext: () => context as unknown as AudioContext,
      fetcher: async (url) => encodeUrl(url),
    });

    player.setQueue([
      { url: "track-a", title: "A" },
      { url: "track-b", title: "B" },
    ]);

    await player.play(0);
    await flushPromises();

    const nextSource = context.createdSources[1];
    const startCall = (nextSource.start as jest.Mock).mock.calls[0][0];
    expect(startCall).toBeCloseTo(9.95, 5);

    const rampEnd = (context.createdGains[1].gain.linearRampToValueAtTime as jest.Mock)
      .mock.calls[0][1];
    expect(rampEnd).toBeCloseTo(10, 5);
  });

  it("reschedules the pending track when the crossfade changes", async () => {
    jest.useFakeTimers();
    const durations = new Map<string, number>([
      ["track-a", 20],
      ["track-b", 20],
    ]);
    const context = new MockAudioContext(durations);
    const player = new WebAudioManager({
      crossfade: 1,
      gapless: true,
      createContext: () => context as unknown as AudioContext,
      fetcher: async (url) => encodeUrl(url),
    });

    player.setQueue([
      { url: "track-a", title: "A" },
      { url: "track-b", title: "B" },
    ]);

    await player.play(0);
    await flushPromises();

    const initialPending = context.createdSources[1];
    expect(initialPending.start).toHaveBeenCalledWith(19);

    player.setCrossfade(4);
    await flushPromises();

    const pendingStop = initialPending.stop as jest.Mock;
    expect(pendingStop).toHaveBeenCalled();

    const replacement = context.createdSources[2];
    expect(replacement.start).toHaveBeenCalledWith(16);
  });

  it("crossfades immediately when skipping tracks manually", async () => {
    const durations = new Map<string, number>([
      ["track-a", 15],
      ["track-b", 18],
    ]);
    const context = new MockAudioContext(durations);
    const player = new WebAudioManager({
      crossfade: 2,
      gapless: false,
      createContext: () => context as unknown as AudioContext,
      fetcher: async (url) => encodeUrl(url),
    });

    const queue: AudioTrack[] = [
      { url: "track-a", title: "A" },
      { url: "track-b", title: "B" },
    ];
    player.setQueue(queue);

    await player.play(0);
    await flushPromises();

    await player.play(1);

    const gainA = context.createdGains[0].gain;
    const gainB = context.createdGains[1].gain;

    expect(gainA.setValueAtTime).toHaveBeenLastCalledWith(0, 0);
    expect(gainA.linearRampToValueAtTime).toHaveBeenLastCalledWith(1, 2);
    expect(gainB.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 2);
  });
});
