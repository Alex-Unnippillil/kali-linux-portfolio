import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type DensityPreset = 'regular' | 'compact';

interface DensityContextValue {
  density: DensityPreset;
  setDensity: (preset: DensityPreset) => void;
}

const DensityContext = createContext<DensityContextValue | undefined>(undefined);

export const DensityProvider = ({ children }: { children: ReactNode }) => {
  const [density, setDensity] = useState<DensityPreset>('regular');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('density-regular', 'density-compact');
    root.classList.add(`density-${density}`);
  }, [density]);

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityContext.Provider>
  );
};

export const useDensity = () => {
  const ctx = useContext(DensityContext);
  if (!ctx) {
    throw new Error('useDensity must be used within a DensityProvider');
  }
  return ctx;
};

export default DensityProvider;
