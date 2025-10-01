export interface NessusDashboardTotals {
  jobs: number;
  falsePositives: number;
}

export interface NessusReportShellData {
  severityCounts: Record<string, number>;
  topFindings: Array<{
    id: string;
    name: string;
    cvss: number;
    severity: string;
    host: string;
    pluginFamily: string;
    description: string;
  }>;
  totalFindings: number;
}

export interface NessusStaticPayload {
  generatedAt: string;
  dashboardTotals: NessusDashboardTotals;
  reportData: NessusReportShellData;
  allFindings: NessusReportShellData['topFindings'];
}

export async function loadNessusStaticPayload(): Promise<NessusStaticPayload> {
  const [scan1, scan2, sample] = await Promise.all([
    import('../../components/apps/nessus/fixtures/scan-1.json'),
    import('../../components/apps/nessus/fixtures/scan-2.json'),
    import('../../components/apps/nessus/sample-report.json'),
  ]);

  const generatedAt = new Date().toISOString();
  const jobFixtures = [scan1.default, scan2.default].filter((entry) =>
    Array.isArray(entry),
  ) as Array<unknown[]>;
  const dashboardTotals: NessusDashboardTotals = {
    jobs: jobFixtures.length,
    falsePositives: Math.max(1, Math.round((sample.default as any[]).length * 0.12)),
  };

  const allFindings = [...(sample.default as NessusReportShellData['topFindings'])];
  const severityCounts = allFindings.reduce<Record<string, number>>((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] ?? 0) + 1;
    return acc;
  }, {});

  const topFindings = allFindings.slice(0, 5);

  return {
    generatedAt,
    dashboardTotals,
    reportData: {
      severityCounts,
      topFindings,
      totalFindings: allFindings.length,
    },
    allFindings,
  };
}

export type NessusDashboardStaticProps = {
  generatedAt: string;
  shellTotals: NessusDashboardTotals;
  initialTotals: NessusDashboardTotals;
};

export async function buildNessusDashboardStaticProps(): Promise<NessusDashboardStaticProps> {
  const payload = await loadNessusStaticPayload();
  return {
    generatedAt: payload.generatedAt,
    shellTotals: payload.dashboardTotals,
    initialTotals: payload.dashboardTotals,
  };
}

export type NessusReportStaticProps = {
  generatedAt: string;
  shellData: NessusReportShellData;
  initialFindings: NessusReportShellData['topFindings'];
};

export async function buildNessusReportStaticProps(): Promise<NessusReportStaticProps> {
  const payload = await loadNessusStaticPayload();
  return {
    generatedAt: payload.generatedAt,
    shellData: payload.reportData,
    initialFindings: payload.allFindings,
  };
}
