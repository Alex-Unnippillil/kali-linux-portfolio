import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import FigletApp from '../components/apps/figlet';

describe('FigletApp', () => {
  it('renders different output for different fonts', async () => {
    const { getByTestId } = render(<FigletApp />);
    const input = getByTestId('text-input');
    fireEvent.change(input, { target: { value: 'Hi' } });
    const select = getByTestId('font-select');
    const outputInitial = await waitFor(() => getByTestId('figlet-output'));
    const textStandard = outputInitial.textContent;
    fireEvent.change(select, { target: { value: 'Slant' } });
    const outputSlant = await waitFor(() => getByTestId('figlet-output'));
    expect(outputSlant.textContent).not.toBe(textStandard);
  });

  it('exports rendered text to a non-empty PNG data URL', async () => {
    const { getByTestId } = render(<FigletApp />);
    fireEvent.change(getByTestId('text-input'), { target: { value: 'Hi' } });
    fireEvent.click(getByTestId('export-btn'));
    const img = await waitFor(() => getByTestId('exported-image'));
    const src = img.getAttribute('src') || '';
    expect(src.startsWith('data:image/png')).toBe(true);
    expect(src.length).toBeGreaterThan('data:image/png;base64,'.length);
  });
});
