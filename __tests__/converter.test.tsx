import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { convertUnit } from '../components/apps/converter/unitConversion.js';
import Converter from '../components/apps/converter/index.jsx';

describe('Unit conversion', () => {
  it('converts meters to kilometers', () => {
    expect(
      convertUnit('length', 'meter', 'kilometer', 1000).toNumber()
    ).toBeCloseTo(1);
  });

  it('converts kilograms to pounds', () => {
    expect(
      convertUnit('weight', 'kilogram', 'pound', 1).toNumber()
    ).toBeCloseTo(2.20462, 5);
  });

  it('converts bytes to kilobytes', () => {
    expect(
      convertUnit('bytes', 'byte', 'kilobyte', 1024).toNumber()
    ).toBeCloseTo(1);
  });

  it('converts seconds to hours', () => {
    expect(
      convertUnit('time', 'second', 'hour', 3600).toNumber()
    ).toBeCloseTo(1);
  });
});

describe('Converter history', () => {
  it('records the last conversion', async () => {
    render(<Converter />);
    const input = screen.getByLabelText('Value');
    fireEvent.change(input, { target: { value: '1' } });
    await act(async () => {});
    await waitFor(() =>
      expect(screen.getByTestId('unit-result').textContent).toContain('1')
    );
    const historyList = screen.getByTestId('history-list');
    const initialCount = historyList.querySelectorAll('li').length;
    expect(initialCount).toBeGreaterThan(0);
    const undoBtn = screen.getByTestId('undo-btn');
    await act(async () => {
      fireEvent.click(undoBtn);
    });
    await waitFor(() =>
      expect(historyList.querySelectorAll('li').length).toBeLessThanOrEqual(
        initialCount
      )
    );
  });
});
