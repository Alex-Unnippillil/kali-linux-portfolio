import React, { useEffect, useRef, useState } from 'react';
import Tabs from '../../ui/Tabs';
import Toast from '../../ui/Toast';
import Modal from '../../ui/Modal';
import { getJson } from '../../../lib/api';

type DataSet = { labels: string[]; data: number[] };

const ChartViewer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState<'line' | 'bar'>('line');
  const [dataset, setDataset] = useState<DataSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showData, setShowData] = useState(false);
  const [Chart, setChart] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getJson<DataSet>('/data/sample-chart.json');
        setDataset(data);
        const mod = await import('../../../lib/chart');
        setChart(() => mod.default);
      } catch (e: any) {
        setError(e.message || 'Failed to load data');
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!dataset || !canvasRef.current || !Chart) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: tab,
      data: {
        labels: dataset.labels,
        datasets: [
          {
            label: 'Sample',
            data: dataset.data,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.4)',
          },
        ],
      },
    });
    return () => chart.destroy();
  }, [dataset, tab, Chart]);

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white flex flex-col items-center p-4">
      <Tabs
        tabs={[{ id: 'line', label: 'Line' }, { id: 'bar', label: 'Bar' }]}
        active={tab}
        onChange={(id) => setTab(id as 'line' | 'bar')}
      />
      <canvas ref={canvasRef} width={300} height={150} />
      <button
        onClick={() => setShowData(true)}
        className="mt-4 px-2 py-1 bg-gray-700 rounded"
      >
        Show Data
      </button>
      {error && (
        <Toast message={error} onClose={() => setError(null)} />
      )}
      <Modal open={showData} onClose={() => setShowData(false)} title="Data">
        <pre className="text-xs whitespace-pre-wrap">
          {JSON.stringify(dataset, null, 2)}
        </pre>
      </Modal>
    </div>
  );
};

export default ChartViewer;
export const displayChartViewer = () => <ChartViewer />;
