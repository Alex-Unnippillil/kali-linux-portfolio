import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { HTTPComposer } from '../../../apps/http';

jest.mock('@monaco-editor/react', () =>
  function MonacoEditorMock({ value, onChange, options, wrapperProps }: any) {
    return (
      <textarea
        data-testid={wrapperProps?.['data-testid'] ?? 'monaco-editor'}
        value={value ?? ''}
        onChange={(event) => onChange?.(event.target.value)}
        readOnly={options?.readOnly}
      />
    );
  }
);

jest.mock('next/dynamic', () =>
  function dynamicMock() {
    const module = require('@monaco-editor/react');
    return module.default || module;
  }
);

describe('HTTPComposer', () => {
  it('renders JSON payload preview with headers', () => {
    render(<HTTPComposer />);

    fireEvent.change(screen.getByLabelText(/Method/i), { target: { value: 'POST' } });
    fireEvent.change(screen.getByLabelText('URL'), {
      target: { value: 'https://api.example.com/demo' },
    });

    fireEvent.change(screen.getAllByPlaceholderText('Header name')[0], {
      target: { value: 'Authorization' },
    });
    fireEvent.change(screen.getAllByPlaceholderText('Header value')[0], {
      target: { value: 'Bearer token' },
    });

    fireEvent.change(screen.getByLabelText('Body mode'), { target: { value: 'json' } });
    fireEvent.change(screen.getByTestId('http-json-editor'), {
      target: { value: '{"greeting": "hello"}' },
    });

    const preview = screen.getByTestId('http-request-preview') as HTMLTextAreaElement;
    expect(preview.value).toContain('"greeting": "hello"');
    expect(preview.value).toContain('"Authorization": "Bearer token"');
    expect(preview.value).toContain('"transport": "mock"');
  });

  it('renders form payload preview', () => {
    render(<HTTPComposer />);

    fireEvent.change(screen.getByLabelText(/Method/i), { target: { value: 'POST' } });
    fireEvent.change(screen.getByLabelText('Body mode'), { target: { value: 'form' } });

    fireEvent.change(screen.getAllByPlaceholderText('Field name')[0], {
      target: { value: 'username' },
    });
    fireEvent.change(screen.getAllByPlaceholderText('Field value')[0], {
      target: { value: 'alice' },
    });

    fireEvent.click(screen.getByText('Add field'));

    const nameInputs = screen.getAllByPlaceholderText('Field name');
    const valueInputs = screen.getAllByPlaceholderText('Field value');
    fireEvent.change(nameInputs[1], { target: { value: 'token' } });
    fireEvent.change(valueInputs[1], { target: { value: '1234' } });

    const preview = screen.getByTestId('http-request-preview') as HTMLTextAreaElement;
    expect(preview.value).toContain('"username": "alice"');
    expect(preview.value).toContain('"token": "1234"');
  });

  it('displays mock response in syntax highlighted editor', async () => {
    render(<HTTPComposer />);

    fireEvent.change(screen.getByLabelText(/Method/i), { target: { value: 'POST' } });
    fireEvent.change(screen.getAllByPlaceholderText('Header name')[0], {
      target: { value: 'X-Demo' },
    });
    fireEvent.change(screen.getAllByPlaceholderText('Header value')[0], {
      target: { value: 'yes' },
    });

    fireEvent.change(screen.getByLabelText('Body mode'), { target: { value: 'json' } });
    fireEvent.change(screen.getByTestId('http-json-editor'), {
      target: { value: '{"demo": true}' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Send Request/i }));

    const responseEditor = await screen.findByTestId('http-response-viewer');

    expect(responseEditor).toBeInTheDocument();
    expect((responseEditor as HTMLTextAreaElement).value).toContain('"X-Demo"');
    expect((responseEditor as HTMLTextAreaElement).value).toContain('"bodyText"');

    // Ensure syntax highlighting editors render for request and response via wrapper props.
    expect(screen.getByTestId('http-request-preview')).toBeInTheDocument();
    expect(responseEditor.getAttribute('data-testid')).toBe('http-response-viewer');
  });
});
