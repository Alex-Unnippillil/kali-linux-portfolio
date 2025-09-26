export const isBetaEnabled = (): boolean => process.env.NEXT_PUBLIC_SHOW_BETA === '1';

export const filterBetaItems = <T extends { beta?: boolean }>(items: T[]): T[] => {
  if (isBetaEnabled()) return items;
  return items.filter((item) => !item.beta);
};
