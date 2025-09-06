let activeWorkspace = 0;

export const getActiveWorkspace = () => activeWorkspace;

export const setActiveWorkspace = (index: number) => {
  activeWorkspace = index;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<number>("workspace-changed", { detail: index })
    );
  }
};

export const nextWorkspace = (count: number) => {
  setActiveWorkspace((activeWorkspace + 1) % count);
};

export const prevWorkspace = (count: number) => {
  setActiveWorkspace((activeWorkspace - 1 + count) % count);
};
