import React from 'react';
import { render } from '@testing-library/react';
import GameLayout from '../components/apps/GameLayout';
import useReducedMotion from '../hooks/useReducedMotion';

jest.mock('../hooks/useReducedMotion');

const mocked = useReducedMotion as unknown as jest.Mock;

test('adds reduced motion data attribute', () => {
  mocked.mockReturnValue(true);
  const { container } = render(<GameLayout>child</GameLayout>);
  expect(container.firstChild).toHaveAttribute('data-reduced-motion', 'true');
});
