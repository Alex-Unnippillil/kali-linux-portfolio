describe('pubsub utility', () => {
  const loadPubsub = async () => {
    jest.resetModules();
    return import('@/utils/pubsub');
  };

  it('delivers published payloads to subscribers', async () => {
    const { publish, subscribe } = await loadPubsub();
    const onMessage = jest.fn();
    const unsubscribe = subscribe('topic', onMessage);

    publish('topic', { ping: true });

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith({ ping: true });

    unsubscribe();
  });

  it('removes listeners on unsubscribe and isolates topics', async () => {
    const { publish, subscribe } = await loadPubsub();
    const onTopicA = jest.fn();
    const onTopicB = jest.fn();

    const stopA = subscribe('topic-a', onTopicA);
    const stopB = subscribe('topic-b', onTopicB);

    stopA();
    publish('topic-a', 'ignored');
    publish('topic-b', 'delivered');

    expect(onTopicA).not.toHaveBeenCalled();
    expect(onTopicB).toHaveBeenCalledWith('delivered');
    stopB();
  });

  it('exposes the pubsub instance on the global scope', async () => {
    const { publish, subscribe } = await loadPubsub();
    expect((globalThis as any).pubsub).toBeDefined();

    const listener = jest.fn();
    const dispose = subscribe('global', listener);
    publish('global', 42);

    expect(listener).toHaveBeenCalledWith(42);
    dispose();
  });
});
