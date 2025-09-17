export type DrawerAppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
  displayName?: string;
  screen?: {
    prefetch?: () => void;
  };
};
