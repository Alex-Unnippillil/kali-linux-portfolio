import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

jest.mock('next/dynamic', () => {
  const ReactModule = require('react');
  return (_importer) => {
    const mod = require('../apps/vscode');
    const Component = mod.default || mod;
    return (props) => ReactModule.createElement(Component, props);
  };
});

import VsCodeWrapper from '../components/apps/vscode';

describe('VSCode shortcut focus management', () => {
  it('allows browser shortcuts when the iframe is unfocused', () => {
    render(<VsCodeWrapper />);
    const iframe = screen.getByTitle('VsCode');

    const listeners: Record<string, (event: any) => void> = {};
    const contentWindow = {
      addEventListener: jest.fn((type, cb) => {
        listeners[type] = cb;
      }),
      removeEventListener: jest.fn((type, cb) => {
        if (listeners[type] === cb) {
          delete listeners[type];
        }
      }),
      dispatchEvent: (event) => {
        listeners[event.type]?.(event);
      },
    };

    Object.defineProperty(iframe, 'contentWindow', {
      configurable: true,
      value: contentWindow,
    });

    fireEvent.load(iframe);
    fireEvent.focus(iframe);

    expect(contentWindow.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    const handler = contentWindow.addEventListener.mock.calls[0][1];

    const activeEvent = {
      type: 'keydown',
      key: 'p',
      ctrlKey: true,
      metaKey: false,
      preventDefault: jest.fn(),
    };
    act(() => {
      handler(activeEvent);
    });
    expect(activeEvent.preventDefault).toHaveBeenCalled();

    fireEvent.blur(iframe);
    expect(contentWindow.removeEventListener).toHaveBeenCalledWith('keydown', handler);

    const unfocusedEvent = {
      type: 'keydown',
      key: 'p',
      ctrlKey: true,
      metaKey: false,
      preventDefault: jest.fn(),
    };
    contentWindow.dispatchEvent(unfocusedEvent);
    expect(unfocusedEvent.preventDefault).not.toHaveBeenCalled();
  });
});
