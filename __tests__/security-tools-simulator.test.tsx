import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MetasploitApp from '../components/apps/metasploit';
import NiktoApp from '../components/apps/nikto';

describe('Security tool simulators', () => {
  const cases = [
    { name: 'metasploit', Component: MetasploitApp },
    { name: 'nikto', Component: NiktoApp },
  ];

  cases.forEach(({ name, Component }) => {
    test(`${name} simulator shows banner and sample output`, () => {
      render(<Component />);
      expect(screen.getByText(/For lab use only/)).toBeInTheDocument();
      const input = screen.getByPlaceholderText('command options');
      fireEvent.change(input, { target: { value: '--help' } });
      fireEvent.click(screen.getByText('Run'));
      expect(
        screen.getByText(new RegExp(`"tool": "${name}"`))
      ).toBeInTheDocument();
    });
  });
});
