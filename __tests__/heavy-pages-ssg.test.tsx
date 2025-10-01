import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AppCatalogShell from '../components/pages/app-catalog/AppCatalogShell';
import AppCatalogHydrated from '../components/pages/app-catalog/AppCatalogHydrated';
import NessusDashboardShell from '../components/pages/nessus-dashboard/NessusDashboardShell';
import NessusDashboardHydrated from '../components/pages/nessus-dashboard/NessusDashboardHydrated';
import NessusReportShell from '../components/pages/nessus-report/NessusReportShell';
import NessusReportHydrated from '../components/pages/nessus-report/NessusReportHydrated';
import {
  buildNessusDashboardStaticProps,
  buildNessusReportStaticProps,
} from '../utils/ssg/nessus';
import { getStaticProps as getAppsStaticProps } from '../pages/apps/index';

describe('static shells maintain hydration parity', () => {
  it('renders consistent totals for the Nessus dashboard', async () => {
    const props = await buildNessusDashboardStaticProps();
    const shell = render(
      <NessusDashboardShell generatedAt={props.generatedAt} totals={props.shellTotals} />,
    );
    expect(shell.getAllByText(`Jobs ${props.shellTotals.jobs}`)[0]).toBeInTheDocument();
    expect(
      shell.getAllByText(`False ${props.shellTotals.falsePositives}`)[0],
    ).toBeInTheDocument();

    window.localStorage.setItem(
      'nessusJobs',
      JSON.stringify(Array.from({ length: props.shellTotals.jobs }, (_, i) => ({ id: i }))),
    );
    window.localStorage.setItem(
      'nessusFalsePositives',
      JSON.stringify(
        Array.from({ length: props.shellTotals.falsePositives }, (_, i) => ({ id: i })),
      ),
    );

    const hydrated = render(
      <NessusDashboardHydrated
        generatedAt={props.generatedAt}
        initialTotals={props.initialTotals}
      />,
    );

    expect(hydrated.getAllByText(`Jobs ${props.shellTotals.jobs}`)[0]).toBeInTheDocument();
    expect(
      hydrated.getAllByText(`False ${props.shellTotals.falsePositives}`)[0],
    ).toBeInTheDocument();
  });

  it('keeps severity totals stable between Nessus report shell and hydration', async () => {
    const props = await buildNessusReportStaticProps();
    const shell = render(
      <NessusReportShell generatedAt={props.generatedAt} shell={props.shellData} />,
    );

    const hydrated = render(
      <NessusReportHydrated
        generatedAt={props.generatedAt}
        initialFindings={props.initialFindings}
      />,
    );

    const shellCounts = Array.from(
      shell.container.querySelectorAll('.font-mono'),
    ).map((node) => node.textContent?.trim());
    const hydratedCounts = Array.from(
      hydrated.container.querySelectorAll('.font-mono'),
    ).map((node) => node.textContent?.trim());
    expect(hydratedCounts).toEqual(shellCounts);

    props.shellData.topFindings.forEach((finding) => {
      expect(hydrated.getAllByText(finding.name)[0]).toBeInTheDocument();
    });
  });

  it('shows the same featured apps before and after hydration', async () => {
    const staticResult = await getAppsStaticProps({});
    const props = 'props' in staticResult ? staticResult.props : staticResult;

    const shell = render(
      <AppCatalogShell generatedAt={props.generatedAt} apps={props.shellApps} />,
    );
    props.shellApps.forEach((app: any) => {
      expect(shell.getByText(app.title)).toBeInTheDocument();
    });

    const hydrated = render(
      <AppCatalogHydrated
        generatedAt={props.generatedAt}
        initialApps={props.initialApps}
        initialMetadata={props.initialMetadata}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    props.shellApps.forEach((app: any) => {
      expect(hydrated.getAllByText(app.title)[0]).toBeInTheDocument();
    });
  });
});
