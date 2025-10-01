import React from 'react';
import { render } from '@testing-library/react';
import Modal from '../components/base/Modal';
import {
  runFocusTrapCheck,
  FocusTrapCheckResult,
} from '../utils/focusTrap';

describe('focus trap diagnostics', () => {
  afterEach(() => {
    const existingModal = document.querySelector('[data-focus-lab-case]');
    if (existingModal?.parentElement) {
      existingModal.parentElement.remove();
    }
  });

  test('base modal passes the tab-cycle diagnostic', () => {
    const root = document.createElement('div');
    root.setAttribute('id', '__next');
    document.body.appendChild(root);

    const inertRoot = document.createElement('div');
    document.body.appendChild(inertRoot);

    const { unmount } = render(
      <Modal isOpen onClose={() => {}} overlayRoot={inertRoot} focusTrapId="diagnostic-modal">
        <button type="button">Confirm</button>
        <button type="button">Cancel</button>
        <a href="#close">Close</a>
      </Modal>,
      { container: root },
    );

    const dialog = document.querySelector<HTMLElement>('[data-focus-lab-case="diagnostic-modal"]');
    expect(dialog).toBeTruthy();
    const result = runFocusTrapCheck(dialog!, {
      id: 'modal',
      label: 'Modal focus trap',
    });
    expect(result.status).toBe<'pass' | 'fail'>('pass');
    expect(result.details).toHaveLength(0);

    unmount();
    document.body.removeChild(root);
    document.body.removeChild(inertRoot);
  });

  test('runFocusTrapCheck reports failures when wrapping breaks', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = `
      <button type="button">First</button>
      <button type="button">Second</button>
    `;

    const result: FocusTrapCheckResult = runFocusTrapCheck(container, {
      id: 'broken',
      label: 'Broken trap',
    });

    expect(result.status).toBe<'pass' | 'fail'>('fail');
    expect(result.details.length).toBeGreaterThan(0);
    expect(result.details.join(' ')).toContain('Shift+Tab');

    document.body.removeChild(container);
  });
});
