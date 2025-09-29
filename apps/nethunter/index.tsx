'use client';

import React, { useMemo, useState } from 'react';
import useOrientation from './hooks/useOrientation';
import Dashboard, { DashboardTile } from './ui/Dashboard';
import QuickActionBar, { QuickToggle } from './ui/QuickActionBar';
import styles from './index.module.css';

type Mode = 'desktop' | 'car';

const carPrimaryTiles: DashboardTile[] = [
  {
    id: 'navigation',
    icon: '🧭',
    title: 'Navigation',
    description: 'Plan secure routes, sync with offline maps, and broadcast ETA updates.',
    actions: [
      {
        id: 'start-trip',
        label: 'Start secure trip',
        detail: 'Uses offline maps and safe checkpoints.',
        tone: 'primary',
      },
      {
        id: 'share-eta',
        label: 'Share ETA to team',
        detail: 'Send encrypted 15-minute updates.',
      },
      {
        id: 'safe-parking',
        label: 'Find safe parking',
        detail: 'Filters lots with trusted Wi-Fi and CCTV.',
      },
    ],
  },
  {
    id: 'comms',
    icon: '📡',
    title: 'Comms & Briefings',
    description: 'Hands-free messaging presets and rapid threat briefings.',
    actions: [
      {
        id: 'call-soc',
        label: 'Call SOC on speaker',
        detail: 'Instantly opens secure VoIP channel.',
        tone: 'primary',
      },
      {
        id: 'quick-brief',
        label: 'Listen to latest threat brief',
        detail: '2 minute audio summary from HQ.',
      },
      {
        id: 'send-checkin',
        label: 'Send status check-in',
        detail: 'Pre-filled voice note with location snippet.',
      },
    ],
  },
  {
    id: 'tools',
    icon: '🛠️',
    title: 'Rapid tools',
    description: 'Launch on-device scanners tuned for vehicle deployments.',
    actions: [
      {
        id: 'bluetooth-sweep',
        label: 'Bluetooth sweep',
        detail: 'Scan for rogue beacons within 30m.',
        tone: 'primary',
      },
      {
        id: 'wifi-capture',
        label: 'Capture Wi-Fi handshake',
        detail: 'Queues sample for offline analysis.',
      },
      {
        id: 'vehicle-diagnostics',
        label: 'Vehicle diagnostics',
        detail: 'Reads CAN bus overlays and alerts.',
        tone: 'alert',
      },
    ],
  },
];

const carSecondaryTiles: DashboardTile[] = [
  {
    id: 'intel',
    icon: '🗂️',
    title: 'Intel packets',
    description: 'Quick access to recon notes and recent findings.',
    actions: [
      {
        id: 'open-playbook',
        label: 'Open mission playbook',
        detail: 'Highlights next objectives.',
      },
      {
        id: 'annotate-findings',
        label: 'Add roadside finding',
        detail: 'Voice-to-text with timestamp.',
      },
    ],
  },
  {
    id: 'safety',
    icon: '🛡️',
    title: 'Safety net',
    description: 'Emergency protocols and fail-safe toggles.',
    actions: [
      {
        id: 'panic',
        label: 'Trigger safe abort',
        detail: 'Notifies HQ and locks device.',
        tone: 'alert',
      },
      {
        id: 'dash-cam',
        label: 'Start dash capture',
        detail: 'Records to encrypted volume.',
      },
    ],
  },
  {
    id: 'automation',
    icon: '🤖',
    title: 'Automation queue',
    description: 'Preview tasks scheduled for the next checkpoint.',
    actions: [
      {
        id: 'review-queue',
        label: 'Review queued scripts',
        detail: 'Approve or snooze automation.',
      },
      {
        id: 'handoff',
        label: 'Prep handoff package',
        detail: 'Compile findings for next operator.',
      },
    ],
  },
];

const quickTogglePresets: QuickToggle[] = [
  {
    id: 'voice-control',
    label: 'Voice control',
    detail: 'Wake phrase "Kali, assist"',
    active: true,
  },
  {
    id: 'do-not-disturb',
    label: 'Do not disturb',
    detail: 'Only priority contacts alert',
    active: false,
  },
  {
    id: 'night-mode',
    label: 'Night mode',
    detail: 'Dim UI and reduce glare',
    active: false,
  },
  {
    id: 'auto-record',
    label: 'Auto record findings',
    detail: 'Capture voice notes when stationary',
    active: true,
  },
];

const desktopModules = [
  {
    title: 'Recon toolkit',
    capabilities: [
      'GPS trail mapper with signal strength overlay',
      'BLE sweeper for rogue beacons',
      'Wi-Fi survey with car mount calibration',
    ],
  },
  {
    title: 'Engagement planner',
    capabilities: [
      'Mission timeline and asset checklist',
      'Offline field notes with voice transcription',
      'Team sync with encrypted status updates',
    ],
  },
  {
    title: 'Post-engagement',
    capabilities: [
      'One-click evidence export to Evidence Vault',
      'Report templates with auto-filled metadata',
      'Handoff packages for SOC review',
    ],
  },
];

const NetHunterApp: React.FC = () => {
  const [mode, setMode] = useState<Mode>('desktop');
  const [toggles, setToggles] = useState<QuickToggle[]>(quickTogglePresets);
  const [lastAction, setLastAction] = useState('Ready for next action.');
  const orientation = useOrientation();

  const handleToggle = (id: string) => {
    setToggles((items) =>
      items.map((toggle) =>
        toggle.id === id ? { ...toggle, active: !toggle.active } : toggle
      )
    );
  };

  const statusMessage = useMemo(() => {
    return mode === 'car'
      ? `Orientation: ${orientation}. ${lastAction}`
      : lastAction;
  }, [lastAction, mode, orientation]);

  const handleAction = (tileId: string, actionId: string) => {
    const actionSummary = `${tileId.replace(/-/g, ' ')} · ${actionId.replace(/-/g, ' ')}`;
    setLastAction(`Selected ${actionSummary}`);
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.title}>
          <span aria-hidden="true">🐉</span>
          <span>Kali NetHunter Command</span>
          <span className={styles.titleBadge}>{mode === 'car' ? 'Car mode' : 'Desktop mode'}</span>
        </div>
        <nav className={styles.modeSwitcher} aria-label="Display mode">
          <button
            type="button"
            className={styles.modeButton}
            aria-pressed={mode === 'desktop'}
            onClick={() => setMode('desktop')}
          >
            Desktop
          </button>
          <button
            type="button"
            className={styles.modeButton}
            aria-pressed={mode === 'car'}
            onClick={() => setMode('car')}
          >
            Car mode
          </button>
        </nav>
      </header>
      <div className={styles.content}>
        {mode === 'desktop' ? (
          <section className={styles.standardPanel}>
            <div className={styles.feedback}>
              <h2>NetHunter mission console</h2>
              <p>
                Curate toolkits, review mission data, and configure car mode presets before deploying to the field.
              </p>
              <output>{statusMessage}</output>
            </div>
            <div className={styles.standardGrid}>
              {desktopModules.map((module) => (
                <article key={module.title} className={styles.standardCard}>
                  <h3>{module.title}</h3>
                  <ul>
                    {module.capabilities.map((capability) => (
                      <li key={capability}>{capability}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <div className={styles.carMode}>
            <Dashboard
              primaryTiles={carPrimaryTiles}
              secondaryTiles={carSecondaryTiles}
              orientation={orientation}
              onAction={handleAction}
              statusMessage={statusMessage}
            />
            <QuickActionBar
              toggles={toggles}
              onToggle={handleToggle}
              orientation={orientation}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default NetHunterApp;
