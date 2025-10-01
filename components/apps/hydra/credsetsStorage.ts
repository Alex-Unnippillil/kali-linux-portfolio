import { secureLoad, secureSave } from '../../../utils/secureStore';
import type { CredentialSet } from './credsetsLogic';

export const HYDRA_CREDSET_STORAGE_KEY = 'hydra/credential-sets';

export const loadHydraCredentialSets = async (): Promise<CredentialSet[]> =>
  secureLoad<CredentialSet[]>(HYDRA_CREDSET_STORAGE_KEY, []);

export const saveHydraCredentialSets = async (
  sets: CredentialSet[],
): Promise<void> => {
  await secureSave(HYDRA_CREDSET_STORAGE_KEY, sets);
};
