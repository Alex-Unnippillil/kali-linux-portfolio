import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Weather from '../components/apps/weather';

describe('Weather component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('unit toggle converts temperatures', async () => {
    const { findByTestId } = render(<Weather demo />);
    const temp = await findByTestId('temp');
    expect(temp.textContent).toBe('21°C');
    const toggle = await findByTestId('unit-toggle');
    fireEvent.click(toggle);
    expect(temp.textContent).toBe('70°F');
  });

  it('renders in demo mode without fetch', async () => {
    const fetchSpy = jest.fn();
    // @ts-ignore
    global.fetch = fetchSpy;
    const { findByTestId } = render(<Weather demo />);
    const temp = await findByTestId('temp');
    expect(temp.textContent).toBe('21°C');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
