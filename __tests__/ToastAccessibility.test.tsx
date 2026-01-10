import React from 'react';
import { act, render, screen } from '@testing-library/react';
import Toast from '../components/ui/Toast';

describe('Toast accessibility behaviours', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  it('keeps the action button keyboard focusable and labelled', () => {
    render(
      <Toast
        message="Saved"
        actionLabel="Undo"
        onAction={() => {}}
      />,
    );
    const actionButton = screen.getByRole('button', { name: 'Undo' });
    expect(actionButton).toHaveAttribute('type', 'button');
    expect(actionButton).toHaveAttribute('aria-label', 'Undo');
  });

  it('pauses auto-dismiss while the toast or its action has focus', () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    render(
      <Toast
        message="Saved"
        actionLabel="Undo"
        onAction={() => {}}
        onClose={onClose}
        duration={6000}
      />,
    );

    const actionButton = screen.getByRole('button', { name: 'Undo' });

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      actionButton.focus();
    });

    act(() => {
      jest.advanceTimersByTime(6000);
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      actionButton.blur();
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
