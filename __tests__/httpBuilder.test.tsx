import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HTTPBuilder, cannedResponses } from '../apps/http';

describe('HTTPBuilder', () => {
  it('validates URL, method rules, and JSON bodies', async () => {
    const user = userEvent.setup();
    render(<HTTPBuilder />);

    const simulateButton = screen.getByRole('button', { name: /simulate request/i });
    await user.click(simulateButton);

    expect(await screen.findByText('URL is required')).toBeInTheDocument();

    const urlField = screen.getByLabelText('URL');
    await user.clear(urlField);
    await user.type(urlField, 'not-a-url');
    await user.click(simulateButton);

    expect(await screen.findByText(/Enter a valid http\(s\) URL/i)).toBeInTheDocument();

    await user.clear(urlField);
    await user.type(urlField, 'https://example.com/api');

    const methodField = screen.getByLabelText('Method');
    await user.selectOptions(methodField, 'POST');

    const headerName = screen.getByPlaceholderText('Header name');
    const headerValue = screen.getByPlaceholderText('Header value');

    await user.type(headerName, 'Content-Type');
    await user.type(headerValue, 'application/json');

    const bodyField = screen.getByLabelText('Request body');
    await user.type(bodyField, '{{}invalid json}}');
    await user.click(simulateButton);

    expect(
      await screen.findByText(/Body must contain valid JSON when Content-Type is set to application\/json/i),
    ).toBeInTheDocument();
  });

  it('loads canned responses and records history entries', async () => {
    const user = userEvent.setup();
    render(<HTTPBuilder />);

    const example = cannedResponses[0];
    const exampleSelect = await screen.findByRole('combobox', { name: /Canned request library/i });
    fireEvent.change(exampleSelect, { target: { value: example.id } });
    await act(async () => {
      fireEvent.submit(screen.getByTestId('http-request-form'));
    });

    const descriptionMatches = await screen.findAllByText(example.description);
    expect(descriptionMatches.length).toBeGreaterThan(0);
    expect(screen.getByText(`Source: ${example.label}`)).toBeInTheDocument();

    const historyItems = await screen.findAllByTestId('history-entry');
    expect(historyItems).toHaveLength(1);
    const latest = historyItems[0];
    expect(within(latest).getByText(example.request.method)).toBeInTheDocument();
    expect(
      within(latest).getByText((content) => content.includes(example.response.statusText)),
    ).toBeInTheDocument();
    expect(screen.getByText(/Mock post title|Offline demo/, { exact: false })).toBeInTheDocument();
  });
});
