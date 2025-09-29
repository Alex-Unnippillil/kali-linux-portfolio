import TouchContextMenuTrigger from '../utils/touchContextMenuTrigger';

describe('TouchContextMenuTrigger', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const createTarget = () => {
    const container = document.createElement('div');
    container.dataset.context = 'app';
    const child = document.createElement('span');
    container.appendChild(child);
    return { container, child };
  };

  const createEvent = (
    target: HTMLElement,
    overrides: Partial<PointerEvent> = {},
  ) => ({
    pointerId: 1,
    pointerType: 'touch',
    clientX: 120,
    clientY: 160,
    pageX: 120,
    pageY: 160,
    target,
    preventDefault: jest.fn(),
    ...overrides,
  } as unknown as PointerEvent);

  it('fires the callback after the configured delay', () => {
    const { child } = createTarget();
    const onTrigger = jest.fn();
    const trigger = new TouchContextMenuTrigger({ delay: 350, onTrigger });

    trigger.begin(createEvent(child), { context: 'app', appId: 'terminal' });
    jest.advanceTimersByTime(349);
    expect(onTrigger).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(onTrigger).toHaveBeenCalledWith(expect.objectContaining({
      pageX: 120,
      pageY: 160,
      meta: { context: 'app', appId: 'terminal' },
    }));

    trigger.dispose();
  });

  it('cancels when the pointer moves beyond the tolerance', () => {
    const { child } = createTarget();
    const onTrigger = jest.fn();
    const trigger = new TouchContextMenuTrigger({ delay: 300, moveTolerance: 10, onTrigger });

    trigger.begin(createEvent(child));
    trigger.move(createEvent(child, { clientX: 140, pageX: 140 }));

    jest.advanceTimersByTime(400);
    expect(onTrigger).not.toHaveBeenCalled();

    trigger.dispose();
  });

  it('ignores non-touch pointers', () => {
    const { child } = createTarget();
    const onTrigger = jest.fn();
    const trigger = new TouchContextMenuTrigger({ delay: 200, onTrigger });

    trigger.begin(createEvent(child, { pointerType: 'mouse' }));
    jest.advanceTimersByTime(300);
    expect(onTrigger).not.toHaveBeenCalled();

    trigger.dispose();
  });

  it('returns metadata when the gesture has fired', () => {
    const { child } = createTarget();
    const onTrigger = jest.fn();
    const trigger = new TouchContextMenuTrigger({ delay: 250, onTrigger });

    const event = createEvent(child);
    const meta = { context: 'taskbar', appId: 'notes' };
    trigger.begin(event, meta);
    jest.advanceTimersByTime(300);
    expect(onTrigger).toHaveBeenCalledTimes(1);

    const result = trigger.end(event);
    expect(result).toEqual(meta);

    trigger.dispose();
  });
});
