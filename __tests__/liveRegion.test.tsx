import React from 'react';
import { act, render, screen } from '@testing-library/react';
import Toast from '../components/ui/Toast';
import FormError from '../components/ui/FormError';
import Toaster, { announcePolite } from '../components/system/Toaster';

describe('live region components', () => {
  it('Toast uses polite live region', () => {
    const { unmount } = render(<Toast message="Saved" />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    unmount();
  });

  it('FormError announces politely', () => {
    render(<FormError>Required field</FormError>);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('Toaster announces custom messages politely', () => {
    jest.useFakeTimers();
    try {
      render(<Toaster />);
      const region = screen.getByRole('status');

      act(() => {
        announcePolite('Saved successfully');
        jest.advanceTimersByTime(80);
      });

      expect(region).toHaveTextContent('Saved successfully');

      act(() => {
        jest.advanceTimersByTime(2200);
      });

      expect(region).toHaveTextContent('');
    } finally {
      jest.useRealTimers();
    }
  });

  it('Toaster announces download start and completion', () => {
    jest.useFakeTimers();
    const link = document.createElement('a');
    try {
      render(<Toaster />);
      const region = screen.getByRole('status');
      link.download = 'report.csv';
      document.body.appendChild(link);

      act(() => {
        link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        jest.advanceTimersByTime(80);
      });

      expect(region).toHaveTextContent('Download started: report.csv');

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(region).toHaveTextContent('Download complete: report.csv');

      act(() => {
        jest.advanceTimersByTime(2200);
      });

      expect(region).toHaveTextContent('');
    } finally {
      if (link.isConnected) {
        document.body.removeChild(link);
      }
      jest.useRealTimers();
    }
  });
});
