import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Window from '@components/base/window';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

describe('Error boundaries', () => {
  it('catches errors in window content', () => {
    jest.useFakeTimers();
    const failingScreen = () => {
      throw new Error('boom');
    };
    render(
      <Window
        id="test-err"
        title="Error Window"
        screen={failingScreen}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
      />,
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(screen.getByText('render_error')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reload app/i }),
    ).toBeInTheDocument();
    jest.useRealTimers();
  });
});
