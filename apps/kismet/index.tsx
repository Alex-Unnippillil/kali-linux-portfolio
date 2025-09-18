'use client';

import React, { useCallback, useState } from 'react';
import KismetApp from '../../components/apps/kismet.jsx';
import DeauthWalkthrough from './components/DeauthWalkthrough';
import { createLogger } from '../../lib/logger';
import {
  KismetCsvColumn,
  KismetCsvSnapshot,
  serializeVisibleSnapshotToCsv,
} from '../../components/apps/kismet/export';

type DeviceRow = {
  ssid: string;
  bssid: string;
  channel?: number;
  frames: number;
};

const KismetPage: React.FC = () => {
  const [visibleSnapshot, setVisibleSnapshot] = useState<KismetCsvSnapshot<DeviceRow>>({
    columns: [] as KismetCsvColumn<DeviceRow>[],
    rows: [],
  });

  const handleNetworkDiscovered = useCallback(
    (net?: { ssid: string; bssid: string; discoveredAt: number }) => {
      if (!net) return;
      const logger = createLogger();
      logger.info('network discovered', {
        ssid: net.ssid || net.bssid,
        time: new Date(net.discoveredAt).toISOString(),
      });
    },
    [],
  );

  const handleVisibleDataChange = useCallback(
    (snapshot: KismetCsvSnapshot<DeviceRow>) => {
      setVisibleSnapshot(snapshot);
    },
    [],
  );

  const handleExportCsv = useCallback(() => {
    if (!visibleSnapshot.columns.length || !visibleSnapshot.rows.length) {
      return;
    }

    const csv = serializeVisibleSnapshotToCsv(visibleSnapshot);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kismet-devices.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [visibleSnapshot]);

  const exportDisabled =
    !visibleSnapshot.columns.length || !visibleSnapshot.rows.length;

  return (
    <>
      <KismetApp
        onNetworkDiscovered={handleNetworkDiscovered}
        onVisibleDataChange={handleVisibleDataChange}
        exportToolbar={
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exportDisabled}
            className="px-3 py-1 text-sm bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Export visible devices as CSV"
          >
            Export CSV
          </button>
        }
      />
      <DeauthWalkthrough />
    </>
  );
};

export default KismetPage;
