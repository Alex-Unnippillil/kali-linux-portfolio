import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NiktoPage from '../apps/nikto';

describe('NiktoPage', () => {
  it('renders fixture data and summary', async () => {
    const user = userEvent.setup();
    render(<NiktoPage />);
    expect(screen.getByLabelText(/lab mode enforced/i)).toBeChecked();
    expect(screen.getByText(/Phase 3 • 3 results/i)).toBeInTheDocument();
    await user.click(screen.getByText('High'));
    await user.click(await screen.findByText('/admin'));
    expect(
      await screen.findByText((content) =>
        content.includes('Potential administration portal found.')
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Critical: 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Warning: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Info: 1/i)).toBeInTheDocument();
  });

  it('formats command preview with builder controls', async () => {
    const user = userEvent.setup();
    render(<NiktoPage />);
    const readCommand = () =>
      screen
        .getByTestId('nikto-command-preview')
        .textContent?.replace(/\s+/g, ' ')
        .trim();

    expect(readCommand()).toBe(
      'nikto -h demo-shop.local -p 443 -ssl -useragent "Nikto/2.5.0 (Lab Simulation)" -output nikto-report.html -Format html # simulation only'
    );

    await user.clear(screen.getByLabelText(/port/i));
    await user.type(screen.getByLabelText(/port/i), '8080');
    await user.click(screen.getByLabelText(/use targets file/i));
    const targetsInput = await screen.findByLabelText(/targets file name/i);
    await user.clear(targetsInput);
    await user.type(targetsInput, 'inventory.txt');
    await user.selectOptions(screen.getByLabelText(/tuning profile/i), '4');
    await user.click(screen.getByLabelText(/toggle directory traversal/i));
    await user.selectOptions(screen.getByLabelText(/output format/i), 'xml');
    const outputInput = screen.getByLabelText(/output file/i);
    await user.clear(outputInput);
    await user.type(outputInput, 'report.xml');
    await user.click(screen.getByLabelText(/randomize user agent per request/i));

    expect(readCommand()).toBe(
      'nikto -i inventory.txt -p 8080 -ssl -Tuning 4 -Plugins dir_traversal -useragent "Nikto/2.5.0 (Lab Simulation) [randomized]" -output report.xml -Format xml # simulation only'
    );
  });
});
