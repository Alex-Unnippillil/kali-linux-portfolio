import React from 'react';
import { render } from '@testing-library/react';
import ResizableHero from '../components/ResizableHero';

describe('ResizableHero', () => {
  it('renders hero container with resize box', () => {
    const { getByTestId } = render(<ResizableHero />);
    expect(getByTestId('resize-box')).toBeInTheDocument();
  });
});
