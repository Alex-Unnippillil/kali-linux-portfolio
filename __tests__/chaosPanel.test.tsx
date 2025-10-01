/** @jest-environment jsdom */

import { act, render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ChaosPanel from '../components/dev/ChaosPanel';
import chaosState from '../lib/dev/chaosState';

describe('ChaosPanel', () => {
  afterEach(() => {
    act(() => {
      chaosState.resetApp();
    });
  });

  it('toggles faults for the selected app', () => {
    render(<ChaosPanel />);
    const timeoutToggle = screen.getByLabelText('Worker timeouts');
    expect(timeoutToggle).toBeInTheDocument();
    expect(timeoutToggle).not.toBeChecked();
    fireEvent.click(timeoutToggle);
    expect(chaosState.isEnabled('terminal', 'timeout')).toBe(true);
    fireEvent.click(timeoutToggle);
    expect(chaosState.isEnabled('terminal', 'timeout')).toBe(false);
  });

});
