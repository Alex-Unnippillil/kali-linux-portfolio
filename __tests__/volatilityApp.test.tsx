import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VolatilityApp from '../components/apps/volatility';
import memoryFixture from '../public/demo-data/volatility/memory.json';

describe('VolatilityApp demo', () => {
  test('renders process tree and modules from fixture', () => {
    render(<VolatilityApp />);
    expect(screen.getByText(/System \(4\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/smss\.exe \(248\)/i));
    expect(screen.getByText('0x2000')).toBeInTheDocument();
  });

  test('shows yara heuristics badges', () => {
    render(<VolatilityApp />);
    fireEvent.click(screen.getByText('yarascan'));

    const heuristic = screen.getByText('suspicious');
    expect(heuristic).toHaveClass('bg-yellow-600');
  });

  test('sends demo segments to heatmap worker', async () => {
    const postMessageSpy = jest.fn();
    // @ts-ignore
    global.Worker = class {
      postMessage = postMessageSpy;
      terminate() {}
    };

    render(<VolatilityApp />);

    await waitFor(() =>
      expect(postMessageSpy).toHaveBeenCalledWith({
        segments: memoryFixture.segments,
      })
    );

    // @ts-ignore
    delete global.Worker;
  });
});
