import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DesktopTour from '../components/ui/DesktopTour';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

describe('DesktopTour', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves flag when skipped', async () => {
    render(<DesktopTour />);
    const skip = await screen.findByRole('button', { name: /skip/i });
    fireEvent.click(skip);
    expect(localStorage.getItem('kali:tourDone')).toBe('true');
  });
});

