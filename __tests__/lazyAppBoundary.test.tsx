import React, { lazy } from 'react';
import { render, screen } from '@testing-library/react';
import LazyAppBoundary from '../components/util-components/LazyAppBoundary';
import ProjectGallerySkeleton from '../components/skeletons/ProjectGallerySkeleton';

const noopPromise = () => new Promise<never>(() => {});

describe('LazyAppBoundary', () => {
  it('renders the fallback while the lazy component is pending', () => {
    const LazyComponent = lazy(noopPromise);

    render(
      <LazyAppBoundary fallback={<div data-testid="fallback" />}> 
        <LazyComponent />
      </LazyAppBoundary>
    );

    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });
});

describe('ProjectGallerySkeleton', () => {
  it('announces loading state and respects reduced motion preferences', () => {
    render(<ProjectGallerySkeleton />);

    expect(
      screen.getByRole('status', { name: /loading project gallery/i })
    ).toBeInTheDocument();

    const shimmerBlocks = screen.getAllByTestId('skeleton-block');
    shimmerBlocks.forEach((block) => {
      expect(block.className).toContain('motion-safe:animate-pulse');
    });
  });
});
