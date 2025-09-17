import React from 'react';
import { act, render } from '@testing-library/react';
import DrawerAppTile from '../components/screen/navbar/drawer/DrawerAppTile';
import { useDrawerLongPress, type DrawerLongPressHandlers } from '../components/screen/navbar/drawer/useDrawerLongPress';

type TriggerFn = Parameters<typeof useDrawerLongPress>[0];

type LongPressDetails = Parameters<TriggerFn>[0];

const withVibrationMock = (fn: () => void) => {
  const originalVibrate = navigator.vibrate;
  const vibrateMock = jest.fn();
  Object.defineProperty(window.navigator, 'vibrate', {
    configurable: true,
    writable: true,
    value: vibrateMock,
  });
  fn();
  Object.defineProperty(window.navigator, 'vibrate', {
    configurable: true,
    writable: true,
    value: originalVibrate,
  });
  return vibrateMock;
};

const createPointerEventMock = (
  currentTarget: HTMLElement,
  target: HTMLElement,
  overrides: Partial<PointerEventInit> = {},
) => ({
  currentTarget,
  target,
  pointerId: 1,
  pointerType: 'touch',
  isPrimary: true,
  clientX: 100,
  clientY: 120,
  pageX: 100,
  pageY: 120,
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  ...overrides,
});

describe('useDrawerLongPress hook', () => {
  const TestHarness: React.FC<{ onTrigger: TriggerFn; capture: (handlers: DrawerLongPressHandlers<HTMLDivElement>) => void }>
    = ({ onTrigger, capture }) => {
      const handlers = useDrawerLongPress<HTMLDivElement>(onTrigger);
      React.useEffect(() => {
        capture(handlers);
      }, [handlers, capture]);
      return (
        <div data-testid="wrapper" {...handlers}>
          <div data-context="app" data-app-id="terminal" tabIndex={0}>
            Terminal
          </div>
        </div>
      );
    };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('fires after a 450ms touch hold and vibrates when supported', () => {
    const onTrigger = jest.fn();
    let vibrateCalls = 0;

    withVibrationMock(() => {
      const vibrateSpy = navigator.vibrate as jest.Mock;
      let handlers: DrawerLongPressHandlers<HTMLDivElement> | null = null;
      const { getByTestId } = render(<TestHarness onTrigger={onTrigger} capture={(h) => { handlers = h; }} />);
      const wrapper = getByTestId('wrapper');
      const context = wrapper.querySelector('[data-context]') as HTMLElement;

      act(() => {
        handlers?.onPointerDown?.(createPointerEventMock(wrapper, context) as any);
        jest.advanceTimersByTime(460);
      });

      expect(onTrigger).toHaveBeenCalledTimes(1);
      vibrateCalls = vibrateSpy.mock.calls.length;

      act(() => {
        handlers?.onPointerUp?.(createPointerEventMock(wrapper, context) as any);
      });
    });

    expect(vibrateCalls).toBeGreaterThan(0);
  });

  test('cancels when the finger moves beyond the scroll threshold', () => {
    const onTrigger = jest.fn();
    let handlers: DrawerLongPressHandlers<HTMLDivElement> | null = null;
    const { getByTestId } = render(<TestHarness onTrigger={onTrigger} capture={(h) => { handlers = h; }} />);
    const wrapper = getByTestId('wrapper');
    const context = wrapper.querySelector('[data-context]') as HTMLElement;

    act(() => {
      handlers?.onPointerDown?.(createPointerEventMock(wrapper, context) as any);
      handlers?.onPointerMove?.(
        createPointerEventMock(wrapper, context, { clientX: 150, clientY: 180, pageX: 150, pageY: 180 }) as any,
      );
      jest.advanceTimersByTime(600);
    });

    expect(onTrigger).not.toHaveBeenCalled();
  });
});

jest.mock('../components/screen/navbar/drawer/useDrawerLongPress', () => {
  const actual = jest.requireActual('../components/screen/navbar/drawer/useDrawerLongPress');
  const hookedCalls: TriggerFn[] = [];
  const wrappedUseDrawerLongPress = (callback: TriggerFn, options?: any) => {
    hookedCalls.push(callback);
    return actual.useDrawerLongPress(callback, options);
  };
  return {
    __esModule: true,
    ...actual,
    useDrawerLongPress: wrappedUseDrawerLongPress,
    __hookedCalls: hookedCalls,
  };
});

describe('DrawerAppTile', () => {
  const { __hookedCalls } = jest.requireMock('../components/screen/navbar/drawer/useDrawerLongPress') as {
    __hookedCalls: TriggerFn[];
  };

  beforeEach(() => {
    __hookedCalls.length = 0;
  });

  test('dispatches a contextmenu event when the long press callback fires', () => {
    const { getByRole } = render(
      <DrawerAppTile id="terminal" title="Terminal" icon="/icons/terminal.svg" onOpen={() => {}} />,
    );
    const button = getByRole('button', { name: 'Terminal' });
    const contextSpy = jest.fn();
    button.addEventListener('contextmenu', contextSpy);

    const trigger = __hookedCalls[0];
    const details: LongPressDetails = {
      target: button,
      clientX: 100,
      clientY: 140,
      pageX: 100,
      pageY: 140,
    };

    act(() => {
      trigger(details);
    });

    expect(contextSpy).toHaveBeenCalledTimes(1);
  });
});
