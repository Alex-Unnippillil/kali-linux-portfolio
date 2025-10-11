import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Beef from '../components/apps/beef';

describe('BeEF app', () => {
  test('renders canned hook inventory and activity timeline', () => {
    render(<Beef />);
    expect(screen.getByRole('button', { name: /Lab Workstation 01/i })).toBeInTheDocument();
    const hookNotes = screen.getByText(/Hook notes/i).parentElement;
    expect(hookNotes).not.toBeNull();
    if (hookNotes) {
      expect(within(hookNotes).getByText(/Primary sandbox for running BeEF walkthroughs/i)).toBeInTheDocument();
    }
    expect(screen.getByText(/Displayed consent banner through alert dialog demo./i)).toBeInTheDocument();
  });

  test('gates advanced modules behind lab mode', () => {
    render(<Beef />);
    const portScannerButton = screen.getByRole('button', { name: /Port Scanner/i });
    expect(portScannerButton).toBeDisabled();

    const labToggle = screen.getByLabelText(/Lab mode/i);
    fireEvent.click(labToggle);

    expect(portScannerButton).not.toBeDisabled();
  });

  test('runs a demo module and surfaces explanations', () => {
    render(<Beef />);
    const browserDetailsButton = screen.getByRole('button', { name: /Browser Details/i });
    fireEvent.click(browserDetailsButton);
    fireEvent.click(screen.getByRole('button', { name: /Run demo module/i }));
    const runPanel = screen.getByText(/Target hook/i).parentElement;
    expect(runPanel).not.toBeNull();
    if (runPanel) {
      expect(within(runPanel).getByText(/Firefox 115 ESR on Kali Linux/i)).toBeInTheDocument();
      expect(within(runPanel).getByText(/navigator.userAgent/i)).toBeInTheDocument();
    }
  });
});
