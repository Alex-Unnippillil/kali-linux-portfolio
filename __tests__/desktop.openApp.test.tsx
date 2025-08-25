import React from 'react';
import { render, act } from '@testing-library/react';

jest.mock('../apps.config', () => ({
  __esModule: true,
  default: [
    {
      id: 'chrome',
      title: 'Chrome',
      icon: '',
      disabled: false,
      favourite: true,
      desktop_shortcut: true,
      screen: () => null,
    },
  ],
  games: [],
  sys: () => '',
}));

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('next/image', () => (props: any) => <img {...props} />);

const Desktop = require('../components/screen/desktop').default;

test('openApp flips closed_windows to false', () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
  jest.useFakeTimers();
  const ref = React.createRef<any>();
  render(<Desktop ref={ref} bg_image_name="sample.jpg" changeBackgroundImage={() => {}} />);
  const instance = ref.current;
  act(() => {
    instance.fetchAppsData();
  });
  const appId = 'chrome';
  expect(instance.state.closed_windows[appId]).toBe(true);
  act(() => {
    instance.openApp(appId);
  });
  expect(instance.state.closed_windows[appId]).toBe(false);
  jest.useRealTimers();

});
