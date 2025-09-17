"use client";

import TourComponent, { type TourProps as BaseTourProps } from "@rc-component/tour";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FC } from "react";

export const TOUR_STORAGE_KEY = "system-tour-complete";
const COMPLETED_FLAG = "1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const getDefaultStorage = (): StorageLike | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

export const createTourPersistence = (
  key: string = TOUR_STORAGE_KEY,
  storage: StorageLike | null | undefined = getDefaultStorage(),
) => {
  const safeStorage = storage ?? undefined;
  const available = Boolean(safeStorage);

  const read = (): boolean => {
    if (!safeStorage) return false;
    try {
      return safeStorage.getItem(key) === COMPLETED_FLAG;
    } catch {
      return false;
    }
  };

  const write = (completed: boolean): void => {
    if (!safeStorage) return;
    try {
      if (completed) {
        if (safeStorage.getItem(key) !== COMPLETED_FLAG) {
          safeStorage.setItem(key, COMPLETED_FLAG);
        }
      } else if (safeStorage.getItem(key) !== null) {
        safeStorage.removeItem(key);
      }
    } catch {
      /* swallow storage errors */
    }
  };

  const clear = (): void => {
    if (!safeStorage) return;
    try {
      if (safeStorage.getItem(key) !== null) {
        safeStorage.removeItem(key);
      }
    } catch {
      /* swallow storage errors */
    }
  };

  return { read, write, clear, available };
};

const defaultPersistence = createTourPersistence();

export const readTourCompletion = (): boolean => defaultPersistence.read();
export const persistTourCompletion = (completed: boolean): void => {
  defaultPersistence.write(completed);
};
export const clearTourCompletion = (): void => {
  defaultPersistence.clear();
};
export const isTourPersistenceAvailable = (): boolean =>
  defaultPersistence.available;

export interface SystemTourProps extends BaseTourProps {
  storageKey?: string;
  persistCompletion?: boolean;
}

const SystemTour: FC<SystemTourProps> = ({
  storageKey = TOUR_STORAGE_KEY,
  open,
  onClose,
  onFinish,
  persistCompletion = true,
  ...rest
}) => {
  const persistence = useMemo(
    () => createTourPersistence(storageKey),
    [storageKey],
  );

  const isControlled = typeof open === "boolean";
  const [internalOpen, setInternalOpen] = useState<boolean>(() => {
    if (isControlled) {
      return open as boolean;
    }
    return !persistence.read();
  });

  useEffect(() => {
    if (typeof open === "boolean") {
      setInternalOpen(open);
    }
  }, [open]);

  useEffect(() => {
    if (typeof open !== "boolean") {
      setInternalOpen(!persistence.read());
    }
  }, [open, persistence]);

  const markCompleted = useCallback(() => {
    if (persistCompletion) {
      persistence.write(true);
    }
  }, [persistCompletion, persistence]);

  const handleFinish = useCallback(() => {
    markCompleted();
    setInternalOpen(false);
    onFinish?.();
  }, [markCompleted, onFinish]);

  const handleClose = useCallback(
    (current: number) => {
      setInternalOpen(false);
      onClose?.(current);
    },
    [onClose],
  );

  return (
    <TourComponent
      {...rest}
      open={internalOpen}
      onClose={handleClose}
      onFinish={handleFinish}
    />
  );
};

export default SystemTour;
