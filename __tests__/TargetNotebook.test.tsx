import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TargetNotebook, {
  TargetNotebookProvider,
  useTargetNotebook,
} from '../apps/reconng/components/TargetNotebook';

describe('TargetNotebook', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const PlannerView = () => {
    const { filteredTargets } = useTargetNotebook();
    return (
      <ul data-testid="planner-view">
        {filteredTargets
          .filter((entry) => entry.context === 'planner')
          .map((entry) => (
            <li key={entry.id}>{entry.value}</li>
          ))}
      </ul>
    );
  };

  const IntelView = () => {
    const { filteredTargets } = useTargetNotebook();
    return (
      <ul data-testid="intel-view">
        {filteredTargets
          .filter((entry) => entry.context === 'intel')
          .map((entry) => (
            <li key={entry.id}>{entry.value}</li>
          ))}
      </ul>
    );
  };

  it('propagates tag filters across consumers', async () => {
    const user = userEvent.setup();
    render(
      <TargetNotebookProvider>
        <TargetNotebook defaultContext="planner" />
        <PlannerView />
        <IntelView />
      </TargetNotebookProvider>,
    );

    const targetInput = screen.getAllByLabelText('Quick add target')[0];
    const contextInput = screen.getAllByLabelText('Quick add context')[0];
    const tagsInput = screen.getAllByLabelText('Quick add tags')[0];
    const addButton = screen.getAllByRole('button', { name: /add target/i })[0];

    await user.type(targetInput, 'example.com');
    await user.clear(contextInput);
    await user.type(contextInput, 'planner');
    await user.type(tagsInput, 'internal');
    await user.click(addButton);
    await screen.findAllByText('example.com');

    await user.type(targetInput, 'corp.local');
    await user.clear(contextInput);
    await user.type(contextInput, 'intel');
    await user.clear(tagsInput);
    await user.type(tagsInput, 'external');
    await user.click(addButton);
    await screen.findAllByText('corp.local');

    const internalButtons = screen.getAllByRole('button', { name: 'internal' });
    await user.click(internalButtons[0]);

    const plannerItems = within(screen.getByTestId('planner-view')).getAllByRole(
      'listitem',
    );
    expect(plannerItems).toHaveLength(1);
    expect(plannerItems[0]).toHaveTextContent('example.com');

    expect(
      within(screen.getByTestId('intel-view')).queryAllByRole('listitem'),
    ).toHaveLength(0);
  });

  it('persists quick-add entries across sessions', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <TargetNotebookProvider>
        <TargetNotebook defaultContext="planner" />
      </TargetNotebookProvider>,
    );

    await user.type(screen.getAllByLabelText('Quick add target')[0], 'persisted.net');
    await user.click(screen.getAllByRole('button', { name: /add target/i })[0]);
    await screen.findByText('persisted.net');

    unmount();

    render(
      <TargetNotebookProvider>
        <TargetNotebook defaultContext="planner" />
      </TargetNotebookProvider>,
    );

    expect(await screen.findByText('persisted.net')).toBeInTheDocument();
  });
});
