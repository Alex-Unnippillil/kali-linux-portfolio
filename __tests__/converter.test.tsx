import { convertUnit } from '../components/apps/converter/UnitConverter';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import UnitConverter from '../components/apps/converter/UnitConverter';

describe('Unit conversion', () => {
  it('converts meters to kilometers', () => {
    expect(convertUnit('length', 'meter', 'kilometer', 1000)).toBeCloseTo(1);
  });

  it('converts kilograms to pounds', () => {
    expect(convertUnit('mass', 'kilogram', 'pound', 1)).toBeCloseTo(2.20462, 5);
  });

  it('converts celsius to fahrenheit', () => {
    expect(convertUnit('temperature', 'celsius', 'fahrenheit', 100)).toBeCloseTo(212);
  });

  it('respects precision when provided', () => {
    expect(
      convertUnit('length', 'meter', 'kilometer', 1234, 2)
    ).toBeCloseTo(1.23, 2);
  });
});

describe('UnitConverter UI', () => {
  it('keeps sliders synchronized', async () => {
    render(<UnitConverter />);
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '3' } });
    await waitFor(() => {
      expect(sliders[1].getAttribute('value')).toBe('3');
    });
  });

  it('shows rounding preview bubble', async () => {
    render(<UnitConverter />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '1.2345' } });
    const sliders = screen.getAllByRole('slider');
    fireEvent.mouseDown(sliders[0]);
    fireEvent.change(sliders[0], { target: { value: '1' } });
    fireEvent.change(sliders[0], { target: { value: '2' } });
    await waitFor(() => {
      expect(screen.getByText('1.23')).toBeInTheDocument();
    });
  });
});
