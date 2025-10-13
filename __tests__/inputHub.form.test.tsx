import React from 'react';
import { render, screen } from '@testing-library/react';
import InputHub from '../pages/input-hub';
import { useRouter } from 'next/router';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@emailjs/browser', () => ({
  init: jest.fn(),
  send: jest.fn(),
}));

const useRouterMock = useRouter as unknown as jest.Mock;

describe('Input Hub form attributes', () => {
  beforeEach(() => {
    useRouterMock.mockReturnValue({ query: {}, isReady: true });
  });

  it('enables mobile friendly attributes for contact fields', () => {
    render(<InputHub />);

    const nameInput = screen.getByPlaceholderText('Name');
    expect(nameInput).toHaveAttribute('inputmode', 'text');
    expect(nameInput).toHaveAttribute('autocomplete', 'name');
    expect(nameInput).toHaveAttribute('autocorrect', 'off');

    const emailInput = screen.getByPlaceholderText('Email');
    expect(emailInput).toHaveAttribute('inputmode', 'email');
    expect(emailInput).toHaveAttribute('autocomplete', 'email');
    expect(emailInput).toHaveAttribute('autocorrect', 'off');

    const messageInput = screen.getByPlaceholderText('Message');
    expect(messageInput).toHaveAttribute('inputmode', 'text');
    expect(messageInput).toHaveAttribute('autocomplete', 'on');
    expect(messageInput).toHaveAttribute('autocorrect', 'on');
  });
});
