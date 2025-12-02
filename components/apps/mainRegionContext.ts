import { createContext, useContext, useEffect, useMemo } from 'react';

export interface MainRegionContextValue {
    mainRegionId: string | null;
    title: string | null;
    titleId: string | null;
    registerMainRegion?: () => void;
}

export const MainRegionContext = createContext<MainRegionContextValue>({
    mainRegionId: null,
    title: null,
    titleId: null,
    registerMainRegion: undefined,
});

export const useMainRegion = () => useContext(MainRegionContext);

export const useMainRegionProps = () => {
    const context = useMainRegion();
    const { registerMainRegion, mainRegionId, titleId } = context;

    useEffect(() => {
        if (typeof registerMainRegion === 'function') {
            registerMainRegion();
        }
    }, [registerMainRegion]);

    return useMemo(() => ({
        id: mainRegionId ?? undefined,
        tabIndex: -1 as const,
        'aria-labelledby': titleId ?? undefined,
        'data-window-main-region': 'true' as const,
    }), [mainRegionId, titleId]);
};
