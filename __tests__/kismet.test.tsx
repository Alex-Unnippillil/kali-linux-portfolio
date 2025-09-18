import React from 'react';
import { render, screen } from '@testing-library/react';
import KismetApp, { downsampleSeries } from '../components/apps/kismet.jsx';

describe('KismetApp', () => {
  it('renders file input', () => {
    render(<KismetApp />);
    expect(screen.getByLabelText(/pcap file/i)).toBeInTheDocument();
  });
});

describe('downsampleSeries', () => {
  it('returns empty array when no points are provided', () => {
    expect(downsampleSeries([])).toEqual([]);
  });

  it('does not change data when under the max threshold', () => {
    const points = Array.from({ length: 5 }, (_, index) => ({ x: index, y: index * 2 }));
    expect(downsampleSeries(points, 10)).toEqual(points);
  });

  it('reduces the number of samples while preserving endpoints', () => {
    const points = Array.from({ length: 600 }, (_, index) => ({ x: index, y: Math.sin(index / 10) }));
    const result = downsampleSeries(points, 60);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result[0]).toEqual(points[0]);
    expect(result[result.length - 1]).toEqual(points[points.length - 1]);
    for (let i = 1; i < result.length; i += 1) {
      expect(result[i].x).toBeGreaterThanOrEqual(result[i - 1].x);
    }
  });

  it('keeps endpoints when maxPoints is very small', () => {
    const points = Array.from({ length: 10 }, (_, index) => ({ x: index, y: index }));
    const result = downsampleSeries(points, 2);
    expect(result).toEqual([points[0], points[points.length - 1]]);
  });
});
