import React, { createContext, useContext, useState } from 'react';

interface PanelPreferencesContextValue {
  editMode: boolean;
  locked: boolean;
  toggleEdit: () => void;
  toggleLock: () => void;
}

const PanelPreferencesContext = createContext<PanelPreferencesContextValue | undefined>(
  undefined
);

export function PanelPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [editMode, setEditMode] = useState(false);
  const [locked, setLocked] = useState(false);

  const toggleEdit = () => setEditMode((v) => !v);
  const toggleLock = () => setLocked((v) => !v);

  return (
    <PanelPreferencesContext.Provider
      value={{ editMode, locked, toggleEdit, toggleLock }}
    >
      {children}
    </PanelPreferencesContext.Provider>
  );
}

export function usePanelPreferences() {
  const ctx = useContext(PanelPreferencesContext);
  if (!ctx) throw new Error('usePanelPreferences must be used within provider');
  return ctx;
}

export default function PanelPreferences() {
  const { editMode, toggleEdit, locked, toggleLock } = usePanelPreferences();
  return (
    <div className="flex items-center gap-4 p-2">
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={editMode} onChange={toggleEdit} />
        Edit mode
      </label>
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={locked} onChange={toggleLock} />
        Lock
      </label>
    </div>
  );
}
