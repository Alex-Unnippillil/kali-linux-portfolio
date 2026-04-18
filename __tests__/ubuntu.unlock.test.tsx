import React, { act } from 'react';
import { render } from '@testing-library/react';
import Ubuntu from '../components/ubuntu';

jest.mock('../components/screen/desktop', () => function DesktopMock() {
  return <div data-testid="desktop" />;
});

jest.mock('../components/screen/navbar', () => function NavbarMock() {
  return <div data-testid="navbar" />;
});

describe('Ubuntu unlock behavior', () => {
  it('unlocks the screen when Enter is pressed', () => {
    let instance: Ubuntu | null = null;
    render(<Ubuntu ref={(component) => (instance = component)} />);

    expect(instance).not.toBeNull();

    act(() => {
      instance!.setState({
        screen_locked: true,
        booting_screen: false,
        desktopMounted: true,
      });
    });

    expect(instance!.state.screen_locked).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(instance!.state.screen_locked).toBe(false);
  });
});
