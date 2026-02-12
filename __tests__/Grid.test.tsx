import React from 'react';
import { render, waitFor } from '@testing-library/react';
import Grid, {
  resetContainerQuerySupportCache,
  supportsContainerQueries,
} from '../components/apps/Grid';

const originalCSS = global.CSS;
const originalContainerRule = (global as any).CSSContainerRule;

describe('App grid container query detection', () => {
  afterEach(() => {
    resetContainerQuerySupportCache();
    global.CSS = originalCSS;
    (global as any).CSSContainerRule = originalContainerRule;
  });

  it('reports support when CSS container queries are available', async () => {
    global.CSS = {
      supports: jest.fn(() => true),
    } as any;

    const { getByTestId } = render(
      <Grid data-testid="grid">
        <div />
      </Grid>,
    );

    await waitFor(() => {
      expect(getByTestId('grid').dataset.containerQueries).toBe('supported');
    });

    expect(getByTestId('grid').className.split(' ')).not.toContain('fallback');
    expect(supportsContainerQueries()).toBe(true);
    expect((global.CSS as any).supports).toHaveBeenCalled();
  });

  it('falls back when CSS.supports reports no container query support', async () => {
    global.CSS = {
      supports: jest.fn(() => false),
    } as any;

    const { getByTestId } = render(
      <Grid data-testid="grid">
        <div />
      </Grid>,
    );

    await waitFor(() => {
      expect(getByTestId('grid').dataset.containerQueries).toBe('fallback');
    });

    expect(getByTestId('grid').className.split(' ')).toContain('fallback');
    expect(supportsContainerQueries()).toBe(false);
  });

  it('can be forced into fallback mode even when support exists', async () => {
    global.CSS = {
      supports: jest.fn(() => true),
    } as any;

    const { getByTestId } = render(
      <Grid data-testid="grid" disableContainerQueries>
        <div />
      </Grid>,
    );

    await waitFor(() => {
      expect(getByTestId('grid').dataset.containerQueries).toBe('forced-fallback');
    });

    const classList = getByTestId('grid').className.split(' ');
    expect(classList).toContain('fallback');
  });
});
