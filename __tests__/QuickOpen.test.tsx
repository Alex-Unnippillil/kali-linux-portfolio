import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import QuickOpen from '../components/common/QuickOpen';
import workspaceStore, { resetWorkspaceStoreForTests } from '../utils/workspaceStore';

describe('QuickOpen overlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    act(() => {
      resetWorkspaceStoreForTests();
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    act(() => {
      resetWorkspaceStoreForTests();
    });
    jest.restoreAllMocks();
  });

  const openOverlay = async () => {
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    act(() => {
      jest.runOnlyPendingTimers();
    });
    await screen.findByRole('dialog');
    return screen.getByPlaceholderText('Search run history, files, views') as HTMLInputElement;
  };

  it('prioritises run identifiers when matching queries', async () => {
    render(<QuickOpen />);
    const input = await openOverlay();
    fireEvent.change(input, { target: { value: 'run' } });
    const options = await screen.findAllByRole('option');
    expect(options[0].textContent).toMatch(/RUN-00[1-9]/i);
  });

  it('dispatches focus events when selecting a file result', async () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    render(<QuickOpen />);
    const input = await openOverlay();
    fireEvent.change(input, { target: { value: 'resume' } });
    const results = await screen.findAllByRole('option');
    const button = within(results[0]).getByRole('button');
    fireEvent.click(button);
    act(() => {
      jest.runAllTimers();
    });
    const eventTypes = dispatchSpy.mock.calls.map(([event]) => event.type);
    expect(eventTypes).toContain('open-app');
    const focusCall = dispatchSpy.mock.calls.find(([event]) => event.type === 'autopsy-focus');
    expect(focusCall).toBeDefined();
    expect(focusCall?.[0].detail).toEqual(
      expect.objectContaining({ kind: 'run', runId: expect.stringMatching(/^RUN-/) })
    );
  });

  it('stores recent queries per workspace', async () => {
    render(<QuickOpen />);
    let input = await openOverlay();
    fireEvent.change(input, { target: { value: 'resume' } });
    let results = await screen.findAllByRole('option');
    let button = within(results[0]).getByRole('button');
    fireEvent.click(button);
    act(() => {
      jest.runAllTimers();
    });
    expect(workspaceStore.getRecentQueries(0)).toContain('resume');

    act(() => {
      workspaceStore.setActiveWorkspace(1);
    });
    input = await openOverlay();
    fireEvent.change(input, { target: { value: 'photo' } });
    results = await screen.findAllByRole('option');
    button = within(results[0]).getByRole('button');
    fireEvent.click(button);
    act(() => {
      jest.runAllTimers();
    });

    expect(workspaceStore.getRecentQueries(0)).toEqual(['resume']);
    expect(workspaceStore.getRecentQueries(1)).toContain('photo');
  });
});
