describe('audio player pooling', () => {
  beforeEach(() => {
    jest.resetModules();
    class MockAudioContext {
      static count = 0;
      state: 'running' | 'suspended' = 'running';
      constructor() {
        MockAudioContext.count += 1;
      }
      resume() {
        this.state = 'running';
      }
    }
    // @ts-expect-error Web Audio API not available in JSDOM
    window.AudioContext = MockAudioContext as any;
    // @ts-expect-error Web Audio API not available in JSDOM
    window.webkitAudioContext = MockAudioContext as any;
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: jest.fn(),
    });
  });

  test('getAudioContext returns singleton', () => {
    const { getAudioContext } = require('../player');
    const ctx1 = getAudioContext();
    const ctx2 = getAudioContext();
    expect(ctx1).toBe(ctx2);
    expect((window.AudioContext as any).count).toBe(1);
  });

  test('players are pooled and context reused', () => {
    const { getAudioContext, getAudioPlayer, releaseAudioPlayer } = require('../player');
    const ctx1 = getAudioContext();
    const a1 = getAudioPlayer('test.mp3');
    const a2 = getAudioPlayer('test.mp3');
    expect(a1).toBe(a2);
    releaseAudioPlayer('test.mp3');
    const a3 = getAudioPlayer('test.mp3');
    expect(a3).not.toBe(a1);
    const ctx2 = getAudioContext();
    expect(ctx2).toBe(ctx1);
    expect((window.AudioContext as any).count).toBe(1);
  });
});
