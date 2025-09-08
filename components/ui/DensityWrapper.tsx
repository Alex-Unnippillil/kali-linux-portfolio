import { ReactNode } from 'react';
import { SettingsContext } from '@/hooks/useSettings';
import { useContext } from 'react';

interface Props {
  children: ReactNode;
}

export default function DensityWrapper({ children }: Props) {
  const { density } = useContext(SettingsContext);
  const className = density === 'compact' ? 'ui-dense' : 'ui-cozy';
  return <div className={className}>{children}</div>;
}
