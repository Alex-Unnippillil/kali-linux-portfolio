import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  getClipboard,
  setClipboard,
  getTimeSync,
  setTimeSync,
  getSharedFolders,
  setSharedFolders,
  defaults,
} from "../utils/tweaksStore";

interface TweaksContextValue {
  clipboard: boolean;
  timeSync: boolean;
  sharedFolders: boolean;
  setClipboard: (v: boolean) => void;
  setTimeSync: (v: boolean) => void;
  setSharedFolders: (v: boolean) => void;
}

export const TweaksContext = createContext<TweaksContextValue>({
  clipboard: defaults.clipboard,
  timeSync: defaults.timeSync,
  sharedFolders: defaults.sharedFolders,
  setClipboard: () => {},
  setTimeSync: () => {},
  setSharedFolders: () => {},
});

export function TweaksProvider({ children }: { children: ReactNode }) {
  const [clipboard, setClipboardState] = useState(defaults.clipboard);
  const [timeSync, setTimeSyncState] = useState(defaults.timeSync);
  const [sharedFolders, setSharedFoldersState] = useState(defaults.sharedFolders);

  useEffect(() => {
    (async () => {
      setClipboardState(await getClipboard());
      setTimeSyncState(await getTimeSync());
      setSharedFoldersState(await getSharedFolders());
    })();
  }, []);

  useEffect(() => {
    setClipboard(clipboard);
  }, [clipboard]);

  useEffect(() => {
    setTimeSync(timeSync);
  }, [timeSync]);

  useEffect(() => {
    setSharedFolders(sharedFolders);
  }, [sharedFolders]);

  return (
    <TweaksContext.Provider
      value={{
        clipboard,
        timeSync,
        sharedFolders,
        setClipboard: setClipboardState,
        setTimeSync: setTimeSyncState,
        setSharedFolders: setSharedFoldersState,
      }}
    >
      {children}
    </TweaksContext.Provider>
  );
}

export const useTweaks = () => useContext(TweaksContext);
