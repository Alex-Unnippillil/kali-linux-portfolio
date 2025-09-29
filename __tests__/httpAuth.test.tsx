import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Auth, { buildBasicHeader, buildBearerHeader } from '../apps/http/components/Auth';
import { HTTPBuilder } from '../apps/http/index';

describe('Authorization header helpers', () => {
  it('buildBearerHeader trims whitespace and generates a header', () => {
    expect(buildBearerHeader('  abc123  ')).toBe('Authorization: Bearer abc123');
  });

  it('buildBasicHeader encodes credentials using base64', () => {
    const header = buildBasicHeader('alice', 'secret');
    expect(header).toBe('Authorization: Basic YWxpY2U6c2VjcmV0');
  });

  it('throws when required inputs are missing', () => {
    expect(() => buildBearerHeader('   ')).toThrow('A bearer token is required.');
    expect(() => buildBasicHeader('', 'secret')).toThrow('A username is required.');
    expect(() => buildBasicHeader('alice', '')).toThrow('A password is required.');
  });
});

describe('Auth component', () => {
  it('surfaces validation errors when inputs are missing', () => {
    const onChange = jest.fn();
    render(<Auth onSanitizedHeaderChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Scheme'), { target: { value: 'bearer' } });
    const tokenInput = screen.getByLabelText('Bearer token');
    fireEvent.blur(tokenInput);

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a bearer token to generate the header.');
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('masks sensitive values in the UI and callbacks', () => {
    const onChange = jest.fn();
    render(<Auth onSanitizedHeaderChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Scheme'), { target: { value: 'bearer' } });
    const tokenInput = screen.getByLabelText('Bearer token');
    fireEvent.change(tokenInput, { target: { value: 'super-secret-token' } });

    expect(screen.getByText('Authorization: Bearer <hidden>')).toBeInTheDocument();
    expect(screen.queryByText('super-secret-token')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith('Authorization: Bearer <hidden>');
  });
});

describe('HTTP builder integration', () => {
  it('includes masked headers in the command preview', () => {
    render(<HTTPBuilder />);

    fireEvent.change(screen.getByLabelText('Scheme'), { target: { value: 'basic' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'passw0rd!' } });

    const preview = screen.getByText(/curl -X GET/);
    expect(preview.textContent).toContain('Authorization: Basic <hidden>');
    expect(preview.textContent).not.toContain('admin');
    expect(preview.textContent).not.toContain('passw0rd!');
  });
});
