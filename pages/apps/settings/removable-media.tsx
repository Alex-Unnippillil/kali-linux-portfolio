import usePersistentState from "../../../hooks/usePersistentState";

export default function RemovableMediaSettings() {
  const [dismissed, setDismissed] = usePersistentState<boolean>(
    "removable-media-banner-dismissed",
    false,
    (v): v is boolean => typeof v === "boolean",
  );

  return (
    <div className="p-4">
      {!dismissed && (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between rounded bg-ub-yellow p-2 text-black"
        >
          <p className="pr-4 text-sm">
            Real automount typically needs GVFS/Polkit.
          </p>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded bg-ubt-grey px-2 py-1 text-xs text-white"
          >
            Dismiss
          </button>
        </div>
      )}
      <p className="text-ubt-grey">
        Removable media settings are not implemented.
      </p>
    </div>
  );
}
