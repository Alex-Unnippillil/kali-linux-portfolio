import React from 'react';
import { render, fireEvent, renderHook, act, waitFor } from '@testing-library/react';
import SpotifyApp from '../components/apps/spotify';
import usePrefersReducedMotion from '../components/hooks/usePrefersReducedMotion';

describe('reduced motion', () => {
  test('hook responds to class toggle', async () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    act(() => {
      document.documentElement.classList.add('reduced-motion');
    });
    await waitFor(() => expect(result.current).toBe(true));
    act(() => {
      document.documentElement.classList.remove('reduced-motion');
    });
    await waitFor(() => expect(result.current).toBe(false));
  });

  test('SpotifyApp does not start when reduced motion', () => {
    document.documentElement.classList.add('reduced-motion');
    const playSpy = jest
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.resolve());
    const { getByText } = render(<SpotifyApp />);
    fireEvent.click(getByText('Start visualization'));
    expect(playSpy).not.toHaveBeenCalled();
    playSpy.mockRestore();
    document.documentElement.classList.remove('reduced-motion');
  });
});
