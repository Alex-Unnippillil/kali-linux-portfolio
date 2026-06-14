import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ArpDiagram from '../apps/ettercap/components/ArpDiagram';

const draggableInstances: Record<string, any> = {};

jest.mock('react-draggable', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, ...rest }: any) => {
      const key = rest['data-node'] ?? `node-${Object.keys(draggableInstances).length}`;
      draggableInstances[key] = rest;
      return <div data-testid={`mock-draggable-${key}`}>{children}</div>;
    },
  };
});

describe('ArpDiagram dragging', () => {
  beforeEach(() => {
    Object.keys(draggableInstances).forEach((key) => {
      delete draggableInstances[key];
    });
  });

  it('keeps nodes within the container while dragging', () => {
    render(<ArpDiagram />);

    const victim = draggableInstances.victim;
    expect(victim).toBeDefined();

    act(() => {
      victim.onDrag?.({} as any, { x: 999, y: 999 } as any);
    });

    const updatedVictim = draggableInstances.victim;
    expect(updatedVictim.position.x).toBeLessThanOrEqual(280);
    expect(updatedVictim.position.y).toBeLessThanOrEqual(160);
  });

  it('snaps positions to the grid on drag stop', () => {
    render(<ArpDiagram />);

    const attacker = draggableInstances.attacker;
    expect(attacker).toBeDefined();

    act(() => {
      attacker.onStop?.({} as any, { x: 173, y: 58 } as any);
    });

    const updatedAttacker = draggableInstances.attacker;
    expect(updatedAttacker.position.x % 6).toBe(0);
    expect(updatedAttacker.position.y % 6).toBe(0);
  });

  it('resets the layout to its initial state', async () => {
    const user = userEvent.setup();
    render(<ArpDiagram />);

    const gateway = draggableInstances.gateway;
    expect(gateway).toBeDefined();

    act(() => {
      gateway.onStop?.({} as any, { x: 200, y: 140 } as any);
    });

    const movedGateway = draggableInstances.gateway;
    expect(movedGateway.position.x).not.toBe(258);
    expect(movedGateway.position.y).not.toBe(120);

    const resetButton = screen.getByRole('button', { name: /reset layout/i });
    await user.click(resetButton);

    const resetGateway = draggableInstances.gateway;
    expect(resetGateway.position.x).toBe(258);
    expect(resetGateway.position.y).toBe(120);
  });
});
