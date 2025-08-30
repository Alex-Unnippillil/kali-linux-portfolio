import type { FC } from 'react';
import type { Artifact } from '../../../apps/autopsy/types';

export interface AutopsyProps {
  initialArtifacts?: Artifact[] | null;
}

declare const AutopsyApp: FC<AutopsyProps>;
export default AutopsyApp;
