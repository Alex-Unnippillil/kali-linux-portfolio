import dynamic from 'next/dynamic';

const ReportViewer = dynamic(() => import('../../apps/report-viewer'), { ssr: false });

export default function ReportViewerPage() {
  return <ReportViewer />;
}
