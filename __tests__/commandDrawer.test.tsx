import { render, screen } from '@testing-library/react';
import CommandDrawer from '../components/CommandDrawer';

describe('CommandDrawer', () => {
  test('shows os, prerequisites, command and output', () => {
    render(
      <CommandDrawer
        open
        onClose={() => {}}
        command="echo hello"
        expectedOutput="hello"
        prerequisites={['bash']}
        os={{ name: 'Ubuntu', version: '22.04' }}
      />
    );
    expect(screen.getByText(/Ubuntu 22.04/)).toBeInTheDocument();
    expect(screen.getByText('bash')).toBeInTheDocument();
    expect(screen.getByLabelText('command')).toHaveTextContent('echo hello');
    expect(screen.getByLabelText('expected output')).toHaveTextContent('hello');
  });
});

