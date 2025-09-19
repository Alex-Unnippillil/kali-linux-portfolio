export const PROFILE_STORAGE_PREFIX = 'profile';

export const getProfileScopedKey = (
  profileId: string | null | undefined,
  key: string,
) => (profileId ? `${PROFILE_STORAGE_PREFIX}:${profileId}:${key}` : key);
