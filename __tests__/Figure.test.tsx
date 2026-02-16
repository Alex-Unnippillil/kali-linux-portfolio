import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Figure from '../components/Figure';

test('renders caption, credit, license and learn more link', () => {
  render(
    <Figure
      src="/test.png"
      alt="test"
      caption="A test image"
      credit="Screenshot by Example"
      license={{ name: 'CC BY', url: 'https://example.com/license' }}
      learnMoreUrl="https://example.com/source"
    />
  );

  expect(screen.getByText('A test image')).toBeInTheDocument();
  expect(screen.getByText(/Screenshot by Example/)).toBeInTheDocument();
  const licenseLink = screen.getByRole('link', { name: 'CC BY' });
  expect(licenseLink).toHaveAttribute('href', 'https://example.com/license');
  expect(screen.getByRole('link', { name: 'Learn more' })).toHaveAttribute(
    'href',
    'https://example.com/source'
  );
});
