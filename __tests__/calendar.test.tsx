import React from 'react';
import { render, screen } from '@testing-library/react';
import Calendar from '../components/ui/Calendar';

describe('Calendar dropdown', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-09-13T13:33:00'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('shows current month and year', () => {
    render(<Calendar open={true} />);
    expect(screen.getByText('September 2025')).toBeInTheDocument();
  });
});
