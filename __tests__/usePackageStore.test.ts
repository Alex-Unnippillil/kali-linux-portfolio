import { act, renderHook } from '@testing-library/react';
import usePackageStore, { PACKAGE_PIN_STORAGE_KEY } from '../hooks/usePackageStore';

describe('usePackageStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses pinned versions when building dry run plans', () => {
    const { result } = renderHook(() => usePackageStore());

    const firstPackage = result.current.packages[0];
    expect(firstPackage).toBeDefined();

    const selectableVersions = firstPackage.versions.map((ver) => ver.version);
    expect(selectableVersions.length).toBeGreaterThan(1);

    const secondaryVersion = selectableVersions[1];
    act(() => {
      result.current.setVersion(firstPackage.id, secondaryVersion);
    });

    const initialPlan = result.current.plan.find((item) => item.id === firstPackage.id);
    expect(initialPlan?.version).toBe(secondaryVersion);

    const pinnedVersion = selectableVersions[0];
    act(() => {
      result.current.pinVersion(firstPackage.id, pinnedVersion);
    });

    const pinnedPlan = result.current.plan.find((item) => item.id === firstPackage.id);
    expect(pinnedPlan?.version).toBe(pinnedVersion);

    const storedPins = JSON.parse(localStorage.getItem(PACKAGE_PIN_STORAGE_KEY) || '{}');
    expect(storedPins[firstPackage.id]).toBe(pinnedVersion);

    const tertiaryVersion = selectableVersions[selectableVersions.length - 1];
    act(() => {
      result.current.setVersion(firstPackage.id, tertiaryVersion);
    });

    const planAfterSelectionChange = result.current.plan.find((item) => item.id === firstPackage.id);
    expect(planAfterSelectionChange?.version).toBe(pinnedVersion);

    act(() => {
      result.current.clearPin(firstPackage.id);
    });

    const planAfterUnpin = result.current.plan.find((item) => item.id === firstPackage.id);
    expect(planAfterUnpin?.version).toBe(tertiaryVersion);
  });
});
