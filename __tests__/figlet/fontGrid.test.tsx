import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FontGrid from '../../apps/figlet/components/FontGrid';

describe('FontGrid', () => {
  const fonts = [
    { name: 'Standard', preview: 'STD', mono: true },
    { name: 'Shadow', preview: 'SHD', mono: false },
  ];

  it('invokes onChange when a font is selected', () => {
    const handleChange = jest.fn();
    render(<FontGrid fonts={fonts} value="" onChange={handleChange} />);

    fireEvent.click(screen.getByRole('button', { name: /select font/i }));
    fireEvent.click(screen.getByRole('option', { name: /Use Shadow font/i }));

    expect(handleChange).toHaveBeenCalledWith('Shadow');
  });

  it('shows monospace badges for mono fonts', () => {
    render(<FontGrid fonts={fonts} value="Standard" onChange={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /standard/i }));

    expect(screen.getAllByText(/Monospace|Proportional/)).toHaveLength(2);
  });
});
