import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WindowSwitcher from '../components/screen/window-switcher';

describe('WindowSwitcher actions', () => {
  const windows = [
    { id: 'terminal', title: 'Terminal' },
    { id: 'browser', title: 'Browser' },
  ];

  test('invokes onMinimizeWindow when minimize button is clicked', () => {
    const onMinimizeWindow = jest.fn();
    const onSelect = jest.fn();

    const { getByLabelText } = render(
      <WindowSwitcher
        windows={windows}
        onSelect={onSelect}
        onMinimizeWindow={onMinimizeWindow}
      />
    );

    fireEvent.click(getByLabelText('Minimize Terminal'));

    expect(onMinimizeWindow).toHaveBeenCalledTimes(1);
    expect(onMinimizeWindow).toHaveBeenCalledWith('terminal');
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('invokes onCloseWindow when close button is clicked', () => {
    const onCloseWindow = jest.fn();
    const onSelect = jest.fn();

    const { getByLabelText } = render(
      <WindowSwitcher
        windows={windows}
        onSelect={onSelect}
        onCloseWindow={onCloseWindow}
      />
    );

    fireEvent.click(getByLabelText('Close Browser'));

    expect(onCloseWindow).toHaveBeenCalledTimes(1);
    expect(onCloseWindow).toHaveBeenCalledWith('browser');
    expect(onSelect).not.toHaveBeenCalled();
  });
});
