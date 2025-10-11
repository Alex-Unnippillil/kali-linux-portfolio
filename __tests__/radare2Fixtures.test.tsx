import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Radare2 from '../components/apps/radare2';
import fixtures from '../apps/radare2/fixtures.json';

describe('Radare2 fixtures', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('r2HelpDismissed', 'true');
  });

  it('renders the default fixture metadata and strings', () => {
    render(<Radare2 initialData={fixtures} />);

    const summary = screen.getByLabelText('Fixture summary');
    expect(summary).toHaveTextContent('Hello stub (ELF64)');
    expect(summary).toHaveTextContent(
      'Minimal entry point that returns zero; ideal for introducing stack frame setup.',
    );

    const stringsSection = screen.getByRole('heading', { name: 'Strings' }).closest('div');
    expect(stringsSection).toBeTruthy();
    if (stringsSection) {
      expect(within(stringsSection).getByText(/hello/i)).toBeInTheDocument();
    }

    expect(screen.getByLabelText('Fixture library')).toBeInTheDocument();
  });

  it('switches fixtures when a new dataset is selected', () => {
    render(<Radare2 initialData={fixtures} />);

    fireEvent.click(screen.getByRole('button', { name: /Password check/ }));

    const summary = screen.getByLabelText('Fixture summary');
    expect(summary).toHaveTextContent('Password check (branch demo)');
    expect(summary).toHaveTextContent(
      'Small decision tree that compares a byte sequence and jumps to success/failure paths.',
    );
  });

  it('gates advanced operations behind lab mode', () => {
    render(<Radare2 initialData={fixtures} />);

    const graphToggle = screen.getByRole('button', { name: 'Graph' });
    expect(graphToggle).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Enable lab mode' }));

    expect(
      screen.getByText('Lab mode on: bookmarks, notes, and graphs stay on this device.'),
    ).toBeInTheDocument();
    expect(graphToggle).not.toBeDisabled();
  });
});
