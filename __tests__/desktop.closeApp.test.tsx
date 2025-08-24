import React from 'react';
import { render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { Desktop } from '@components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('../apps.config', () => ({
  __esModule: true,
  default: [
    {
      id: 'calc',
      title: 'Calc',
      icon: '',
      disabled: false,
      favourite: false,
      desktop_shortcut: false,
      screen: () => null,
    },
  ],
  games: [],
  sys: () => '',
}));
jest.mock('next/image', () => (props: any) => React.createElement('img', props));

describe('Desktop.closeApp', () => {
  it('marks window as closed without mutating other entries', () => {
    jest.useFakeTimers();

    const componentDidMountSpy = jest
      .spyOn(Desktop.prototype as any, 'componentDidMount')
      .mockImplementation(function (this: Desktop) {
        this.fetchAppsData();
      });

    const ref = React.createRef<Desktop>();
    render(<Desktop ref={ref} />);
    const instance = ref.current!;

    act(() => {
      instance.openApp('calc');
      jest.advanceTimersByTime(200);
    });

    const prevClosedRef = instance.state.closed_windows;
    const prevClosedCopy = { ...prevClosedRef };

    act(() => {
      instance.closeApp('calc');
    });

    expect(instance.state.closed_windows['calc']).toBe(true);
    expect(instance.state.closed_windows).toEqual({
      ...prevClosedCopy,
      calc: true,
    });
    expect(instance.state.closed_windows).not.toBe(prevClosedRef);

    componentDidMountSpy.mockRestore();
    jest.useRealTimers();
  });
});
