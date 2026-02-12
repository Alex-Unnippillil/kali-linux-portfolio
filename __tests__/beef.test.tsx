import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import Beef from '../components/apps/beef';

describe('BeEF app', () => {
  test('advances through lab steps to payload builder', () => {
    render(<Beef />);
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    // move through sandbox, simulated hook and demo module steps
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/Payload Builder/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Payloads run locally in a sandbox and never touch the network./i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  test('can reset lab back to disclaimer', () => {
    render(<Beef />);
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    // advance to final step
    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    }
    fireEvent.click(screen.getByRole('button', { name: /reset lab/i }));
    expect(screen.getByText(/Disclaimer/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Use these security tools only in environments where you have explicit authorization./i)
    ).toBeInTheDocument();
  });

  test('module gallery groups modules and surfaces output types', () => {
    render(<Beef />);
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByRole('heading', { name: /social engineering/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /data harvesting/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Alert Dialog/)[0]).toBeInTheDocument();
    expect(screen.getByText(/Output: Modal dialog/)).toBeInTheDocument();
    expect(screen.getByText(/Run a module to stream its simulation output./i)).toBeInTheDocument();
  });

  test('running a module demo streams sequential output', () => {
    jest.useFakeTimers();

    try {
      render(<Beef />);
      fireEvent.click(screen.getByRole('button', { name: /begin/i }));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      const alertHeading = screen.getAllByText('Alert Dialog')[0];
      const alertCard = alertHeading.closest('article');
      expect(alertCard).not.toBeNull();
      const runButton = within(alertCard as HTMLElement).getByRole('button', { name: /run demo/i });

      fireEvent.click(runButton);

      const timelinePanel = screen
        .getByText(/demo timeline/i)
        .closest('div')
        ?.parentElement?.parentElement;
      expect(timelinePanel).not.toBeNull();

      act(() => {
        jest.advanceTimersByTime(450);
      });
      expect(within(timelinePanel as HTMLElement).getAllByText(/Deploying payload: alert dialog stub/i)[0]).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(450);
      });
      expect(within(timelinePanel as HTMLElement).getAllByText(/Browser executed window\.alert/i)[0]).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(450);
      });
      expect(within(timelinePanel as HTMLElement).getAllByText(/Operator saw acknowledgement/i)[0]).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(400);
      });
      expect(within(alertCard as HTMLElement).getByText(/Done/i)).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});
