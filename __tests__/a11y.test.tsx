import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import GameLayout from '../components/apps/GameLayout';

expect.extend(toHaveNoViolations);

describe('accessibility', () => {
  it('GameLayout is accessible', async () => {
    const { container } = render(
      <GameLayout stage={1} lives={3} score={10} highScore={20}>
        <canvas />
      </GameLayout>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
