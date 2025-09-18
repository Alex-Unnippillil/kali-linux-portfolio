import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SnapTargets from '@/components/core/SnapTargets';
import {
  WindowManager,
  type SnapTarget,
  type Rect,
} from '@/modules/desktop/windowManager';
import { createMemoryWindowLayoutRepository } from '@/utils/storage/windowLayouts';

describe('Desktop window layout presets', () => {
  const viewport: Rect = { x: 0, y: 0, width: 1920, height: 1080 };

  it('applies preset layouts and persists assignments per display', () => {
    const repository = createMemoryWindowLayoutRepository();
    const manager = new WindowManager({
      displayId: 'display-1',
      viewport,
      repository,
    });

    manager.registerWindow('one');
    manager.registerWindow('two');

    const placements = manager.applyPreset('split-50-50');
    expect(placements.one.width).toBeCloseTo(960, 5);
    expect(placements.two.x).toBeCloseTo(960, 5);

    const stored = repository.load('display-1');
    expect(stored?.preset).toBe('split-50-50');
    expect(stored?.assignments.one.slot).toBe(0);

    const nextPreset = manager.cyclePreset();
    expect(nextPreset).toBe('thirds');

    const targets = manager.getSnapTargets({ includeAll: true });
    expect(targets).toHaveLength(14);

    const followUp = new WindowManager({
      displayId: 'display-1',
      viewport,
      repository,
    });
    followUp.registerWindow('one');
    followUp.registerWindow('two');

    const restored = followUp.getWindowBounds('one');
    expect(restored?.width).toBeCloseTo(960, 5);

    followUp.snapWindowToTarget('one', 'grid-2x2:3');
    const updated = repository.load('display-1');
    expect(updated?.assignments.one.preset).toBe('grid-2x2');
    expect(updated?.assignments.one.slot).toBe(3);
  });
});

describe('SnapTargets overlay affordances', () => {
  const baseTargets: SnapTarget[] = [
    {
      id: 'split-50-50:0',
      preset: 'split-50-50',
      slotIndex: 0,
      rect: { x: 0, y: 0, width: 960, height: 1080 },
      label: '50/50 Split 1 of 2',
    },
    {
      id: 'split-50-50:1',
      preset: 'split-50-50',
      slotIndex: 1,
      rect: { x: 960, y: 0, width: 960, height: 1080 },
      label: '50/50 Split 2 of 2',
    },
  ];

  it('reveals targets while dragging and invokes selection callback', () => {
    const handleSelect = jest.fn();
    render(
      <SnapTargets targets={baseTargets} isDragging onSelect={handleSelect} />
    );

    const overlay = screen.getByTestId('snap-targets-overlay');
    expect(overlay).toHaveAttribute('aria-hidden', 'false');

    fireEvent.click(screen.getByTestId('snap-target-split-50-50:0'));
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'split-50-50:0' })
    );
  });

  it('supports keyboard toggling, cycling, and committing selections', () => {
    const handleSelect = jest.fn();
    const handleCancel = jest.fn();
    render(
      <SnapTargets
        targets={baseTargets}
        onSelect={handleSelect}
        onCancel={handleCancel}
      />
    );

    const overlay = screen.getByTestId('snap-targets-overlay');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');

    fireEvent.keyDown(window, { key: ' ', ctrlKey: true, altKey: true });
    expect(overlay).toHaveAttribute('aria-hidden', 'false');
    expect(
      screen.getByTestId('snap-target-split-50-50:0')
    ).toHaveAttribute('aria-current', 'true');

    fireEvent.keyDown(window, {
      key: 'ArrowRight',
      ctrlKey: true,
      altKey: true,
    });
    expect(
      screen.getByTestId('snap-target-split-50-50:1')
    ).toHaveAttribute('aria-current', 'true');

    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true, altKey: true });
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'split-50-50:1' })
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleCancel).toHaveBeenCalled();
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
  });
});
