import { convertUnit } from '../components/apps/converter/unitData';
import { render, fireEvent, screen } from '@testing-library/react';
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

  it('rounds to the nearest integer when precision is zero', () => {
    expect(convertUnit('length', 'meter', 'kilometer', 1499, 0)).toBe(1);
    expect(convertUnit('length', 'meter', 'kilometer', 1500, 0)).toBe(2);
  });

  it('rounds halves away from zero', () => {
    expect(convertUnit('length', 'kilometer', 'kilometer', -1.5, 0)).toBe(-2);
    expect(convertUnit('length', 'kilometer', 'kilometer', 1.5, 0)).toBe(2);
  });
});

describe('UnitConverter UI', () => {
  it('keeps inputs synchronized', () => {
    render(<UnitConverter />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '1000' } });
    expect(inputs[1].value).toBe('1');
  });
});
