/** @jest-environment node */

jest.mock('@components/screen/desktop', () => () => null);
jest.mock('@components/screen/navbar', () => () => null);
jest.mock('@components/screen/lock_screen', () => () => null);
jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

import Ubuntu from '@components/ubuntu';

describe('Ubuntu component server-side', () => {
  it('does not throw when window and localStorage are unavailable', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const ubuntu = new Ubuntu({});
    expect(() => {
      ubuntu.getLocalData();
      ubuntu.unLockScreen();
      ubuntu.changeBackgroundImage('wall-1');
      ubuntu.lockScreen();
      ubuntu.shutDown();
      ubuntu.turnOn();
    }).not.toThrow();
    errorSpy.mockRestore();
  });
});
