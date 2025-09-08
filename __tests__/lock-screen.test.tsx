import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import LockScreen from '@/components/screen/LockScreen';

jest.mock('@/lib/wallpaper', () => ({
  useWallpaper: () => 'test-wallpaper.webp',
}));

describe('LockScreen', () => {
  it('renders blurred wallpaper', () => {
    const { getByAltText } = render(<LockScreen open onClose={() => {}} />);
    const img = getByAltText('');
    expect(img).toHaveAttribute('src', 'test-wallpaper.webp');
    expect(img.className).toContain('blur');
  });

  it('focuses input and closes on ESC', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(<LockScreen open onClose={onClose} />);
    const input = getByLabelText('Password');
    expect(input).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
