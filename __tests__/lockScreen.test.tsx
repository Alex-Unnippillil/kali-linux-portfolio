import React from 'react';
import { render, screen } from '@testing-library/react';
import LockScreen from '../components/screen/lock_screen';

jest.mock('../components/util-components/clock', () => function ClockMock() {
  return <div data-testid="clock" />;
});

jest.mock('../components/util-components/kali-wallpaper', () => function KaliWallpaperMock() {
  return <div data-testid="kali-wallpaper" />;
});

jest.mock('../hooks/useSettings', () => ({
  useSettings: () => ({
    bgImageName: 'aurora',
    useKaliWallpaper: false,
  }),
}));

describe('LockScreen live region', () => {
  it('announces lock state changes', () => {
    const handleUnlock = jest.fn();
    const { rerender } = render(<LockScreen isLocked={true} unLockScreen={handleUnlock} />);

    expect(screen.getByRole('status')).toHaveTextContent('Screen locked');

    rerender(<LockScreen isLocked={false} unLockScreen={handleUnlock} />);
    expect(screen.getByRole('status')).toHaveTextContent('Screen unlocked');

    rerender(<LockScreen isLocked={true} unLockScreen={handleUnlock} />);
    expect(screen.getByRole('status')).toHaveTextContent('Screen locked');
  });
});
