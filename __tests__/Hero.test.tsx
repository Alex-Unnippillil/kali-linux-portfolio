import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Hero from '../components/ui/Hero';

test('renders hero content', () => {
  render(
    <Hero
      title="My Title"
      summary={['First', 'Second']}
      meta={[{ label: 'Info', value: 'Details' }]}
    />
  );

  expect(screen.getByRole('heading', { name: 'My Title' })).toBeInTheDocument();
  expect(screen.getByText('First')).toBeInTheDocument();
  expect(screen.getByText('Details')).toBeInTheDocument();
});

