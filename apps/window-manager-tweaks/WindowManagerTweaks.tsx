"use client";

import { useEffect, useState } from 'react';
import Tabs from '../../components/Tabs';
import ToggleSwitch from '../../components/ToggleSwitch';
import {
  CompositorSettings,
  loadCompositor,
  updateCompositor,
} from '../../src/wm/compositor';

export default function WindowManagerTweaks() {
  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'compositor', label: 'Compositor' },
  ] as const;
  type TabId = (typeof tabs)[number]['id'];
  const [active, setActive] = useState<TabId>('compositor');

  const [settings, setSettings] = useState<CompositorSettings>(() => loadCompositor());

  useEffect(() => {
    setSettings(loadCompositor());
  }, []);

  const handleToggle = (key: keyof CompositorSettings) => (val: boolean) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    updateCompositor({ [key]: val });
  };

  return (
    <div className="p-4 text-ubt-grey">
      <Tabs tabs={tabs} active={active} onChange={setActive} />
      {active === 'compositor' && (
        <div className="space-y-4 mt-4">
          <div className="flex items-center space-x-2">
            <span>CSS Effects</span>
            <ToggleSwitch
              ariaLabel="CSS Effects"
              checked={settings.css}
              onChange={handleToggle('css')}
            />
          </div>
          <div className="flex items-center space-x-2">
            <span>WebGL Effects</span>
            <ToggleSwitch
              ariaLabel="WebGL Effects"
              checked={settings.webgl}
              onChange={handleToggle('webgl')}
            />
          </div>
        </div>
      )}
    </div>
  );
}
