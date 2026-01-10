"use client";

import { SyntheticEvent, useCallback, useRef } from "react";

export function DialogDemo() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openDialog = useCallback(() => {
    if (!dialogRef.current) return;

    if (typeof dialogRef.current.showModal === "function") {
      dialogRef.current.showModal();
    } else {
      dialogRef.current.setAttribute("open", "");
    }
  }, []);

  const closeDialog = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const handleCancel = useCallback(
    (event: SyntheticEvent<HTMLDialogElement, Event>) => {
      event.preventDefault();
      closeDialog();
    },
    [closeDialog]
  );

  const handleClose = useCallback(() => {
    window.requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        ref={triggerRef}
        onClick={openDialog}
        className="rounded bg-slate-800 px-4 py-2 text-white shadow"
      >
        Open dialog
      </button>

      <dialog
        ref={dialogRef}
        aria-modal="true"
        className="rounded-lg border border-slate-700 bg-slate-900 p-6 text-left text-slate-100 shadow-xl"
        onCancel={handleCancel}
        onClose={handleClose}
      >
        <p className="mb-4">This is a native dialog element rendered as a modal.</p>
        <button
          type="button"
          onClick={closeDialog}
          className="rounded bg-slate-700 px-3 py-2 text-sm text-white"
        >
          Close
        </button>
      </dialog>
    </div>
  );
}

export default DialogDemo;
