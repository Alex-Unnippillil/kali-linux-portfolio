import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ReaverStepper from '../../components/apps/reaver';

describe('ReaverStepper', () => {
  it('renders the default dataset summary and warnings', () => {
    render(<ReaverStepper />);

    expect(screen.getByText(/Reaver Handshake Lab/)).toBeInTheDocument();
    expect(
      screen.getByText(/Baseline handshake captured after a lab client/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/For classroom access points only/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Simulation only: command builders wrap every example/i),
    ).toBeInTheDocument();
  });

  it('switches datasets via the selector', () => {
    render(<ReaverStepper />);

    fireEvent.change(screen.getByLabelText(/handshake dataset/i), {
      target: { value: 'wps-pin-lab' },
    });

    expect(
      screen.getByText(/WPS PIN Workflow – Training Router/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Router intentionally vulnerable for curriculum demos/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Registrar announces public key and nonce/i),
    ).toBeInTheDocument();
  });

  it('updates safe command output when inputs change', () => {
    render(<ReaverStepper />);

    const monitorInputs = screen.getAllByLabelText(/Monitor interface/i);
    fireEvent.change(monitorInputs[0], { target: { value: 'lab0mon' } });

    expect(
      screen.getByText((content) =>
        content.includes('lab-handshake lab0mon'),
      ),
    ).toBeInTheDocument();
  });
});
