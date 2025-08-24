import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { test, expect } from 'vitest';
import BadgeList from './BadgeList';

test('filters and selects badges', () => {
  const badges = [
    { src: 'a.png', alt: 'A badge', label: 'Alpha', description: 'First badge' },
    { src: 'b.png', alt: 'B badge', label: 'Beta', description: 'Second badge' },
  ];
  render(<BadgeList badges={badges} />);
  expect(screen.getByAltText('A badge')).toBeInTheDocument();
  const input = screen.getByPlaceholderText(/filter skills/i);
  fireEvent.change(input, { target: { value: 'bet' } });
  expect(screen.queryByAltText('A badge')).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: 'alpha' } });
  fireEvent.click(screen.getByAltText('A badge'));
  expect(screen.getByText('First badge')).toBeInTheDocument();
  fireEvent.click(screen.getByText(/close/i));
  expect(screen.queryByText('First badge')).not.toBeInTheDocument();
});
