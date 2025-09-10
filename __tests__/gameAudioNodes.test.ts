describe('game audio node manager', () => {
  let close: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    close = jest.fn().mockResolvedValue(undefined);

    class MockGainNode {
      connect = jest.fn();
      disconnect = jest.fn();
    }

    class MockAudioContext {
      static count = 0;
      state: 'running' | 'suspended' = 'running';
      destination = {};
      constructor() {
        MockAudioContext.count += 1;
      }
      createGain() {
        return new MockGainNode() as unknown as GainNode;
      }
      resume() {
        this.state = 'running';
      }
      close = close;
    }

    // @ts-expect-error AudioContext mock
    window.AudioContext = MockAudioContext as any;
    // @ts-expect-error AudioContext mock
    window.webkitAudioContext = MockAudioContext as any;
  });

  test('getAudioContext returns singleton', () => {
    const { getAudioContext } = require('../games/common/audio');
    const ctx1 = getAudioContext();
    const ctx2 = getAudioContext();
    expect(ctx1).toBe(ctx2);
    expect((window.AudioContext as any).count).toBe(1);
  });

  test('request and release nodes, closing context when unused', () => {
    const { requestAudioNode, releaseAudioNode } = require('../games/common/audio');
    const node1 = requestAudioNode();
    const node2 = requestAudioNode();
    releaseAudioNode(node1);
    expect(close).not.toHaveBeenCalled();
    releaseAudioNode(node2);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
