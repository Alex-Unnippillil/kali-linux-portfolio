export type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

const getBadgeNavigator = (): BadgeNavigator | undefined => {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  return navigator as BadgeNavigator;
};

export const setBadge = async (count: number): Promise<void> => {
  const badgeNavigator = getBadgeNavigator();

  if (!badgeNavigator?.setAppBadge) {
    return;
  }

  try {
    await badgeNavigator.setAppBadge(count);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to set app badge", error);
    }
  }
};

export const clearBadge = async (): Promise<void> => {
  const badgeNavigator = getBadgeNavigator();

  if (!badgeNavigator?.clearAppBadge) {
    return;
  }

  try {
    await badgeNavigator.clearAppBadge();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to clear app badge", error);
    }
  }
};
