"use client";

import { useEffect, useRef, useState } from "react";

export function useFnd03Dynamic<TModule>(
  loader: () => Promise<TModule>,
  shouldLoad: boolean,
) {
  const [module, setModule] = useState<TModule | null>(null);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => {
    let cancelled = false;
    if (!shouldLoad || module) {
      return;
    }

    loaderRef
      .current()
      .then((value) => {
        if (!cancelled) {
          setModule(value);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("FND-03 dynamic helper failed", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [shouldLoad, module]);

  return module;
}

