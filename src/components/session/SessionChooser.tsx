'use client';

import React, { useEffect, useState } from 'react';
import type { SessionProfile } from '../../../session/manager';
import { listSessions, getDefaultSession, setDefaultSession } from '../../../session/manager';

export default function SessionChooser() {
  const [sessions, setSessions] = useState<SessionProfile[]>([]);
  const [defaultId, setDefaultId] = useState<string>('');

  useEffect(() => {
    const list = listSessions();
    setSessions(list);
    const def = getDefaultSession();
    if (def) setDefaultId(def.id);
  }, []);

  const handleChange = (id: string) => {
    setDefaultId(id);
    setDefaultSession(id);
  };

  return (
    <div className="space-y-2">
      {sessions.map((profile) => (
        <div key={profile.id} className="flex items-center justify-between">
          <span>{profile.name}</span>
          <div className="flex items-center space-x-1">
            <input
              id={`default-${profile.id}`}
              type="radio"
              name="default-session"
              checked={defaultId === profile.id}
              onChange={() => handleChange(profile.id)}
            />
            <label htmlFor={`default-${profile.id}`}>Set as default</label>
          </div>
        </div>
      ))}
    </div>
  );
}

