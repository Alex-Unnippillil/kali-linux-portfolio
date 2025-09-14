import React from 'react';
import { render } from '@testing-library/react';
import MirrorsPage from '../pages/mirrors';
import mirrorsData from '../data/mirrors.json';
import type { Mirror } from '../components/MirrorMap';

const mirrors = mirrorsData as Mirror[];

describe('Mirrors page', () => {
  it('renders a pin for each mirror', () => {
    const { container } = render(<MirrorsPage />);
    expect(container.querySelectorAll('svg circle')).toHaveLength(mirrors.length);
  });

  it('includes a noscript fallback table', () => {
    const { container } = render(<MirrorsPage />);
    expect(container.querySelector('noscript')).not.toBeNull();
  });
});
