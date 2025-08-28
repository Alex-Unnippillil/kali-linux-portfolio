import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import Memory from '../components/apps/memory';
import { jsx as _jsx } from "react/jsx-runtime";
jest.mock('../components/apps/memory_utils', () => ({
  createDeck: () => [{
    id: 0,
    value: 'A'
  }, {
    id: 1,
    value: 'A'
  }, {
    id: 2,
    value: 'B'
  }, {
    id: 3,
    value: 'B'
  }, {
    id: 4,
    value: 'C'
  }, {
    id: 5,
    value: 'C'
  }, {
    id: 6,
    value: 'D'
  }, {
    id: 7,
    value: 'D'
  }, {
    id: 8,
    value: 'E'
  }, {
    id: 9,
    value: 'E'
  }, {
    id: 10,
    value: 'F'
  }, {
    id: 11,
    value: 'F'
  }, {
    id: 12,
    value: 'G'
  }, {
    id: 13,
    value: 'G'
  }, {
    id: 14,
    value: 'H'
  }, {
    id: 15,
    value: 'H'
  }]
}));
beforeEach(() => {
  jest.useFakeTimers();
  // minimal matchMedia polyfill
  window.matchMedia = window.matchMedia || (query => ({
    matches: false,
    media: query,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }));
  // requestAnimationFrame using timers
  window.requestAnimationFrame = cb => {
    return setTimeout(() => cb(performance.now()), 0);
  };
  window.cancelAnimationFrame = id => clearTimeout(id);
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({
      data: []
    })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => []),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({
      width: 0
    })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
    createLinearGradient: jest.fn(() => ({
      addColorStop: jest.fn()
    }))
  }));
});
afterEach(() => {
  jest.useRealTimers();
});
test('combo meter increments and resets', () => {
  const {
    getAllByRole,
    getByTestId
  } = render(/*#__PURE__*/_jsx(Memory, {}));
  const cards = getAllByRole('button');
  const combo = getByTestId('combo-meter');
  expect(combo.textContent).toContain('0');
  fireEvent.click(cards[0]);
  fireEvent.click(cards[1]);
  act(() => {
    jest.runOnlyPendingTimers();
  });
  expect(combo.textContent).toContain('1');
  fireEvent.click(cards[2]);
  fireEvent.click(cards[3]);
  act(() => {
    jest.runOnlyPendingTimers();
  });
  expect(combo.textContent).toContain('2');
  fireEvent.click(cards[4]);
  fireEvent.click(cards[6]);
  act(() => {
    jest.runOnlyPendingTimers();
  });
  expect(combo.textContent).toContain('0');
});
test('card flip applies transform style', () => {
  const {
    getAllByRole
  } = render(/*#__PURE__*/_jsx(Memory, {}));
  const card = getAllByRole('button')[0];
  const inner = card.querySelector('[data-testid="card-inner"]');
  expect(inner.style.transform).toBe('rotateY(0deg)');
  fireEvent.click(card);
  expect(inner.style.transform).toBe('rotateY(180deg)');
});
