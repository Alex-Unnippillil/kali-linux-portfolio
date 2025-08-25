import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const ReportViewer = dynamic(() => import('../../apps/report-viewer'), {
  ssr: false,
});

export default function ReportViewerPage() {
  return (
    <UbuntuWindow title="report viewer">
      <ReportViewer />
    </UbuntuWindow>
  );
}
