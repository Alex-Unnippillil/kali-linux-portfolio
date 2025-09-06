import { fireEvent, render, screen } from '@testing-library/react';
import LockScreen from '../components/session/LockScreen';

jest.mock('../hooks/useSettings', () => ({
  useSettings: () => ({ wallpaper: 'test-wall' }),
}));

describe('LockScreen', () => {
  it('submits password and handles escape', () => {
    const onUnlock = jest.fn();
    const onCancel = jest.fn();
    render(
      <LockScreen username="alex" onUnlock={onUnlock} onCancel={onCancel} />,
    );
    const input = screen.getByLabelText(/password/i);
    fireEvent.change(input, { target: { value: 'secret' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(onUnlock).toHaveBeenCalledWith('secret');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
    expect(screen.getByText('alex')).toBeInTheDocument();
  });
});

