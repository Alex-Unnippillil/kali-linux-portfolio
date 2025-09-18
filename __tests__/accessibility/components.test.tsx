import { render } from '@testing-library/react';
import React from 'react';
import { axe } from 'jest-axe';

jest.mock('marked', () => ({ marked: { parse: (md: string) => md } }));
jest.mock('dompurify', () => ({
  __esModule: true,
  default: { sanitize: (html: string) => html },
  sanitize: (html: string) => html,
}));

import HelpPanel from '../../components/HelpPanel';
import Tabs from '../../components/Tabs';
import ToggleSwitch from '../../components/ToggleSwitch';

describe('core interactive components accessibility', () => {
  it('Tabs renders without accessibility violations', async () => {
    const tabs = [
      { id: 'first', label: 'First tab' },
      { id: 'second', label: 'Second tab' },
    ] as const;

    function Harness() {
      const [active, setActive] = React.useState<typeof tabs[number]['id']>('first');
      const panelIdFor = (id: typeof tabs[number]['id']) => `harness-panel-${id}`;

      return (
        <div>
          <Tabs
            tabs={tabs}
            active={active}
            onChange={setActive}
            idPrefix="harness-tab"
            getPanelId={(id) => panelIdFor(id)}
          />
          {tabs.map((tab) => (
            <section
              key={tab.id}
              id={panelIdFor(tab.id)}
              role="tabpanel"
              aria-labelledby={`harness-tab-${tab.id}`}
              hidden={active !== tab.id}
            >
              <p>{tab.label}</p>
            </section>
          ))}
        </div>
      );
    }

    const { container } = render(<Harness />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ToggleSwitch renders without accessibility violations', async () => {
    const { container } = render(
      <ToggleSwitch ariaLabel="Enable feature" checked={false} onChange={() => {}} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('HelpPanel button renders without accessibility violations when closed', async () => {
    const { container } = render(<HelpPanel appId="sample" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
