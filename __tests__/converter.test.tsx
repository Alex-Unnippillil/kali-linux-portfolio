import { convertUnit } from '../components/apps/converter/units';
import { render, fireEvent, screen } from '@testing-library/react';
import UnitConverter from '../components/apps/converter/UnitConverter';
import Converter from '../components/apps/converter';

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

  it('converts currency using static rates', () => {
    expect(convertUnit('currency', 'USD', 'EUR', 10)).toBeCloseTo(9);
  });

  it('converts seconds to minutes', () => {
    expect(convertUnit('time', 'second', 'minute', 60)).toBeCloseTo(1);
  });

  it('converts megabytes to kilobytes', () => {
    expect(convertUnit('digital', 'megabyte', 'kilobyte', 1)).toBeCloseTo(1000);
  });

  it('converts square meters to square feet', () => {
    expect(convertUnit('area', 'square meter', 'square foot', 1)).toBeCloseTo(
      10.7639,
      4,
    );
  });

  it('converts liters to gallons', () => {
    expect(convertUnit('volume', 'liter', 'gallon', 3.78541)).toBeCloseTo(1, 5);
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

  it('shows new categories in dropdown', () => {
    render(<UnitConverter />);
    const select = screen.getByLabelText('Category') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(
      expect.arrayContaining(['time', 'digital', 'area', 'volume']),
    );
  });
});

describe('Converter shell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('includes the new temperature tool tab', () => {
    render(<Converter />);

    expect(screen.getByRole('tab', { name: 'Temperature' })).toBeInTheDocument();
  });

  it('filters converter tools by search', () => {
    render(<Converter />);

    fireEvent.change(screen.getByLabelText('Search converter tools'), {
      target: { value: 'checksum' },
    });

    expect(screen.getByRole('tab', { name: 'Hash' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Unit' })).not.toBeInTheDocument();
  });
});
