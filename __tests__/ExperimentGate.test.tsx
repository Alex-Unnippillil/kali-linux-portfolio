import React from 'react';
import { act, render, screen } from '@testing-library/react';
import ExperimentGate from '../components/util-components/ExperimentGate';
import { ExperimentsProvider, type ExperimentFlagLoader } from '../hooks/useExperiments';

describe('ExperimentGate', () => {
  const renderWithFlags = (
    loader: ExperimentFlagLoader,
    ui: React.ReactNode,
  ) =>
    render(<ExperimentsProvider loader={loader}>{ui}</ExperimentsProvider>);

  it('renders fallback when the flag is disabled', async () => {
    renderWithFlags(async () => ({ 'demo-flag': false }), (
      <ExperimentGate flag="demo-flag" fallback={<span>nope</span>}>
        <span>hello</span>
      </ExperimentGate>
    ));

    expect(await screen.findByText('nope')).toBeInTheDocument();
    expect(screen.queryByText('hello')).not.toBeInTheDocument();
  });

  it('logs exposure only once when enabled', async () => {
    const onExposure = jest.fn();
    const { rerender } = renderWithFlags(async () => ({ 'demo-flag': true }), (
      <ExperimentGate flag="demo-flag" onExposure={onExposure}>
        <span>hello</span>
      </ExperimentGate>
    ));

    expect(await screen.findByText('hello')).toBeInTheDocument();
    expect(onExposure).toHaveBeenCalledTimes(1);

    rerender(
      <ExperimentsProvider loader={async () => ({ 'demo-flag': true })}>
        <ExperimentGate flag="demo-flag" onExposure={onExposure}>
          <span>hello</span>
        </ExperimentGate>
      </ExperimentsProvider>,
    );

    expect(await screen.findByText('hello')).toBeInTheDocument();
    expect(onExposure).toHaveBeenCalledTimes(1);
  });

  it('waits for async loader before resolving state', async () => {
    let resolve: (value: Record<string, boolean>) => void = () => {};
    const loader: ExperimentFlagLoader = () =>
      new Promise((res) => {
        resolve = res;
      });

    renderWithFlags(loader, (
      <ExperimentGate flag="demo-flag" fallback={<span>nope</span>}>
        <span>hello</span>
      </ExperimentGate>
    ));

    expect(screen.queryByText('hello')).toBeNull();
    expect(screen.queryByText('nope')).toBeNull();

    await act(async () => {
      resolve({ 'demo-flag': false });
    });

    expect(await screen.findByText('nope')).toBeInTheDocument();
  });
});
