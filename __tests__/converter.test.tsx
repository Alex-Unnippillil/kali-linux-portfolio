import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import UnitConverter, {
  convertUnit,
} from '../components/apps/converter/UnitConverter';

describe('Unit conversion', () => {
  it('converts meters to kilometers', () => {
    expect(convertUnit('length', 'meter', 'kilometer', 1000)).toBeCloseTo(1);
  });

  it('converts kilograms to pounds', () => {
    expect(convertUnit('weight', 'kilogram', 'pound', 1)).toBeCloseTo(2.20462, 5);
  });

  it('respects precision when provided', () => {
    expect(
      convertUnit('length', 'meter', 'kilometer', 1234, 2)
    ).toBeCloseTo(1.23, 2);
  });

  it('throws on invalid unit', () => {
    expect(() => convertUnit('length', 'meter', 'lightyear', 1)).toThrow();
  });

  it('swap inverts units without crashing', () => {
    const { getByLabelText, getByTestId } = render(<UnitConverter />);
    fireEvent.change(getByLabelText('Value'), { target: { value: '1000' } });
    fireEvent.click(getByTestId('unit-swap'));
    const fromSelect = getByLabelText('From');
    const toSelect = getByLabelText('To');
    expect((fromSelect as HTMLSelectElement).value).toBe('kilometer');
    expect((toSelect as HTMLSelectElement).value).toBe('meter');
    expect(getByTestId('unit-result').textContent).toContain('kilometer');
  });
});
