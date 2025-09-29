import { VictimRecord } from '../data/victims';

const normalize = (value: string) => value.trim().toLowerCase();

export const filterVictimsByTags = (
  victims: VictimRecord[],
  requiredTags: string[],
): VictimRecord[] => {
  if (!requiredTags.length) {
    return victims;
  }

  const normalizedRequired = Array.from(
    new Set(
      requiredTags
        .map((tag) => normalize(tag))
        .filter((tag) => tag.length > 0),
    ),
  );

  if (!normalizedRequired.length) {
    return victims;
  }

  return victims.filter((victim) => {
    const victimTags = new Set(
      (victim.tags || [])
        .map((tag) => normalize(tag))
        .filter((tag) => tag.length > 0),
    );

    return normalizedRequired.every((tag) => victimTags.has(tag));
  });
};
