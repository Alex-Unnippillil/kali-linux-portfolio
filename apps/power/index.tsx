'use client';

import React, { useState } from 'react';
import Tabs from '../../components/Tabs';
import ToggleSwitch from '../../components/ToggleSwitch';

export default function PowerSettings() {
  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'system', label: 'System' },
    { id: 'display', label: 'Display' },
    { id: 'devices', label: 'Devices' },
  ] as const;
  type TabId = (typeof tabs)[number]['id'];
  const [activeTab, setActiveTab] = useState<TabId>('general');

  const [handleBrightnessKeys, setHandleBrightnessKeys] = useState(true);
  const [lidAction, setLidAction] = useState('suspend');
  const [blankAfter, setBlankAfter] = useState(10);
  const [sleepAfter, setSleepAfter] = useState(15);
  const [offAfter, setOffAfter] = useState(20);

  return (
    <div className="w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey">
      <div className="flex justify-center border-b border-gray-900">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>
      {activeTab === 'general' && (
        <div className="p-4 space-y-4 text-ubt-grey">
          <div className="flex items-center justify-between">
            <span>Handle display brightness keys</span>
            <ToggleSwitch
              checked={handleBrightnessKeys}
              onChange={setHandleBrightnessKeys}
              ariaLabel="Handle display brightness keys"
            />
          </div>
        </div>
      )}
      {activeTab === 'system' && (
        <div className="p-4 space-y-4 text-ubt-grey">
          <div className="flex items-center justify-between">
            <label htmlFor="lid-action">When laptop lid is closed</label>
            <select
              id="lid-action"
              value={lidAction}
              onChange={(e) => setLidAction(e.target.value)}
              className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
            >
              <option value="nothing">Do nothing</option>
              <option value="suspend">Suspend</option>
              <option value="hibernate">Hibernate</option>
            </select>
          </div>
        </div>
      )}
      {activeTab === 'display' && (
        <div className="p-4 space-y-4 text-ubt-grey">
          <div className="flex items-center justify-between">
            <label htmlFor="blank-after">Blank screen after (minutes)</label>
            <input
              id="blank-after"
              type="number"
              min="1"
              value={blankAfter}
              onChange={(e) => setBlankAfter(parseInt(e.target.value) || 0)}
              className="w-20 bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
              aria-label="Blank screen after in minutes"
            />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="sleep-after">Put display to sleep after (minutes)</label>
            <input
              id="sleep-after"
              type="number"
              min="1"
              value={sleepAfter}
              onChange={(e) => setSleepAfter(parseInt(e.target.value) || 0)}
              className="w-20 bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
              aria-label="Put display to sleep after in minutes"
            />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="off-after">Switch off display after (minutes)</label>
            <input
              id="off-after"
              type="number"
              min="1"
              value={offAfter}
              onChange={(e) => setOffAfter(parseInt(e.target.value) || 0)}
              className="w-20 bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
              aria-label="Switch off display after in minutes"
            />
          </div>
        </div>
      )}
      {activeTab === 'devices' && (
        <div className="p-4 text-ubt-grey">No power devices detected.</div>
      )}
    </div>
  );
}

