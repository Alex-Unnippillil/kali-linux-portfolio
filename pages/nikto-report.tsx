import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import NiktoReportClient from '../components/nikto/NiktoReportClient';
import { NIKTO_SEVERITY_COLORS } from '../components/nikto/constants';
import { getNiktoReport, getNiktoSeverities } from '../lib/reports/nikto';

const buildSeverityList = (available: string[]) =>
  available.filter((severity) => severity !== 'All');

export const getStaticProps: GetStaticProps<{
  initialData: ReturnType<typeof getNiktoReport> & {
    availableSeverities: string[];
    timings: { serverMs: number };
  };
}> = async () => {
  const report = getNiktoReport();
  const severities = ['All', ...getNiktoSeverities()];
  return {
    props: {
      initialData: {
        ...report,
        availableSeverities: severities,
        timings: { serverMs: 0 },
      },
    },
  };
};

type NiktoReportPageProps = InferGetStaticPropsType<typeof getStaticProps>;

const NiktoReportPage = ({ initialData }: NiktoReportPageProps) => {
  const severityOrder = buildSeverityList(initialData.availableSeverities);

  return (
    <div className="min-h-screen space-y-4 bg-gray-900 p-4 text-white">
      <h1 className="text-2xl">Nikto Report</h1>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {severityOrder.map((sev) => (
          <div
            key={sev}
            className="flex items-center justify-between rounded bg-gray-800 p-2"
          >
            <span
              className="rounded px-2 py-0.5 text-xs text-white"
              style={{ backgroundColor: NIKTO_SEVERITY_COLORS[sev] ?? '#4b5563' }}
            >
              {sev}
            </span>
            <span className="font-mono">
              {initialData.summaryCounts[sev] ?? 0}
            </span>
          </div>
        ))}
      </div>
      <NiktoReportClient initialData={initialData} />
    </div>
  );
};

export default NiktoReportPage;
