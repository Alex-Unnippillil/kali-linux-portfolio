import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import CommandBuilder from '../components/CommandBuilder';

jest.useFakeTimers();

it('opens terminal and dispatches command when run in terminal is checked', async () => {
  const openApp = jest.fn();
  const listener = jest.fn();
  window.addEventListener('run-terminal-command', listener as any);
  const { getByLabelText } = render(
    <CommandBuilder doc="" build={({ target = '' }) => `echo ${target}`.trim()} openApp={openApp} />
  );
  fireEvent.change(getByLabelText('target'), { target: { value: 'hi' } });
  await act(async () => {
    fireEvent.click(getByLabelText('Run in terminal'));
    jest.runAllTimers();
  });
  expect(openApp).toHaveBeenCalledWith('terminal');
  expect(listener).toHaveBeenCalled();
  const event = listener.mock.calls[0][0] as CustomEvent<string>;
  expect(event.detail).toBe('echo hi');
  window.removeEventListener('run-terminal-command', listener as any);
});
