import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WhiskerMenu from '../components/menu/WhiskerMenu';

jest.mock('next/image', () => (props: any) => <img {...props} alt={props.alt || ''} />);

jest.mock('../components/base/ubuntu_app', () => ({ name, openApp }: any) => (
  <button onClick={openApp}>{name}</button>
));

describe('WhiskerMenu category persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('saves selected category and restores on open', () => {
    const { unmount } = render(<WhiskerMenu />);

    fireEvent.click(screen.getByRole('button', { name: /applications/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Games' }));

    expect(window.localStorage.getItem('kali:lastCat')).toBe('games');

    fireEvent.click(screen.getByRole('button', { name: /applications/i }));
    unmount();

    render(<WhiskerMenu />);
    fireEvent.click(screen.getByRole('button', { name: /applications/i }));
    const gamesBtn = document.querySelector('button[data-cat="games"]');
    expect(gamesBtn?.className).toContain('bg-gray-700');
  });
});

