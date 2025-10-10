import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import UbuntuApp from '../components/base/ubuntu_app';

jest.mock('next/image', () =>
  function MockedImage(props: any) {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />;
  },
);

describe('UbuntuApp tooltip', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders tooltip content when focused', () => {
    render(
      <UbuntuApp
        id="terminal"
        name="Terminal"
        icon="/themes/Yaru/apps/bash.png"
        description="Simulated shell with offline commands."
        openApp={jest.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Terminal' });
    expect(trigger).toHaveAttribute('aria-describedby', 'app-tooltip-terminal');

    act(() => {
      fireEvent.focus(trigger);
      jest.advanceTimersByTime(350);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Terminal');
    expect(tooltip).toHaveTextContent('Simulated shell with offline commands.');
  });

  it('does not render tooltip when disabled explicitly', () => {
    render(
      <UbuntuApp
        id="grid"
        name="Grid"
        icon="/themes/Yaru/apps/bash.png"
        description="Fallback description"
        hideDescriptionTooltip
        openApp={jest.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Grid' });
    expect(trigger).not.toHaveAttribute('aria-describedby');

    act(() => {
      fireEvent.mouseEnter(trigger);
      jest.advanceTimersByTime(400);
    });

    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
