import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import Converter from '../apps/converter';

describe('converter precision', () => {
  it('uses fixed decimals when sig figs disabled', () => {
    render(React.createElement(Converter));
    const from = screen.getAllByRole('spinbutton')[0] as HTMLInputElement;
    fireEvent.change(from, { target: { value: '1234' } });
    const to = screen.getAllByRole('spinbutton')[1] as HTMLInputElement;
    expect(to.value).toBe('1.23');
  });

  it('uses significant figures when enabled', () => {
    render(React.createElement(Converter));
    const sigFigToggle = screen.getByLabelText('Sig figs');
    fireEvent.click(sigFigToggle);
    const from = screen.getAllByRole('spinbutton')[0] as HTMLInputElement;
    fireEvent.change(from, { target: { value: '1234' } });
    const to = screen.getAllByRole('spinbutton')[1] as HTMLInputElement;
    expect(to.value).toBe('1.2');
  });
});
