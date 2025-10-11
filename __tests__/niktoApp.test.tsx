import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NiktoApp from '../components/apps/nikto';

describe('NiktoApp', () => {
  it('renders fixture findings and lab banner', () => {
    render(<NiktoApp />);
    expect(screen.getByText('/admin')).toBeInTheDocument();
    expect(
      screen.getByText('Potential administration portal found.')
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/lab mode enforced/i)).toBeChecked();
  });

  it('formats command preview with builder options', async () => {
    const user = userEvent.setup();
    render(<NiktoApp />);
    const readCommand = () =>
      screen
        .getByTestId('nikto-command-preview')
        .textContent?.replace(/\s+/g, ' ')
        .trim();

    expect(readCommand()).toBe(
      'nikto -h demo-shop.local -p 443 -ssl -useragent "Nikto/2.5.0 (Lab Simulation)" -output nikto-report.html -Format html # simulation only'
    );

    await user.clear(screen.getByLabelText(/port/i));
    await user.type(screen.getByLabelText(/port/i), '8443');
    await user.click(screen.getByLabelText(/use targets file/i));
    const targetsInput = await screen.findByLabelText(/targets file name/i);
    await user.clear(targetsInput);
    await user.type(targetsInput, 'scope.txt');
    await user.selectOptions(screen.getByLabelText(/tuning profile/i), '123');
    await user.click(screen.getByLabelText(/toggle apache expect xss/i));
    await user.selectOptions(screen.getByLabelText(/output format/i), 'json');
    const outputInput = screen.getByLabelText(/output file/i);
    await user.clear(outputInput);
    await user.type(outputInput, 'lab.json');
    await user.click(screen.getByLabelText(/randomize user agent per request/i));

    expect(readCommand()).toBe(
      'nikto -i scope.txt -p 8443 -ssl -Tuning 123 -Plugins apache_expect_xss -useragent "Nikto/2.5.0 (Lab Simulation) [randomized]" -output lab.json -Format json # simulation only'
    );
  });

  it('parses dropped text report and displays data', async () => {
    render(<NiktoApp />);
    const zone = screen.getByTestId('drop-zone');
    const file = {
      name: 'report.txt',
      text: () => Promise.resolve('Host: example.com\n/admin High'),
    } as any;
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(await screen.findByText('example.com')).toBeInTheDocument();
    expect((await screen.findAllByText('/admin')).length).toBeGreaterThan(0);
  });

  it('filters entries by severity and path prefix', async () => {
    const user = userEvent.setup();
    render(<NiktoApp />);
    const zone = screen.getByTestId('drop-zone');
    const file = {
      name: 'report.txt',
      text: () =>
        Promise.resolve(
          'Host: example.com\n/admin High\n/cgi-bin/test Medium'
        ),
    } as any;
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    await screen.findByText('/admin');
    const pathInput = await screen.findByPlaceholderText(/filter path/i);
    await user.type(pathInput, '/cgi');
    const severitySelect = await screen.findByLabelText(/filter severity/i);
    await user.selectOptions(severitySelect, 'Medium');
    const parseTable = screen
      .getAllByRole('table')
      .find((table) => within(table).queryByText('Host'));
    expect(parseTable).toBeDefined();
    expect(within(parseTable as HTMLElement).queryByText('/admin')).toBeNull();
    expect(within(parseTable as HTMLElement).getByText('/cgi-bin/test')).toBeInTheDocument();
  });
});
