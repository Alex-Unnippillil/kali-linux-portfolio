import { createEventBus } from '../../utils/pubsub';

describe('createEventBus', () => {
  it('cleans up subscriptions when unsubscribe is invoked', () => {
    const bus = createEventBus<{ ping: number }>();
    const handler = jest.fn();
    const unsubscribe = bus.subscribe('ping', handler);

    bus.publish('ping', 1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(1);

    unsubscribe();

    bus.publish('ping', 2);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
