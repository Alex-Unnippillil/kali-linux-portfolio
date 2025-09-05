"use client";

import React from "react";
import Modal from "../base/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

const NetworkEditor: React.FC<Props> = ({ open, onClose }) => (
  <Modal isOpen={open} onClose={onClose}>
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="bg-ub-cool-grey text-white w-80 rounded shadow border border-black border-opacity-20">
        <div className="flex justify-between items-center border-b border-black border-opacity-20 px-4 py-2">
          <h2 className="text-lg">Network Connections</h2>
          <button
            aria-label="Close"
            className="text-white hover:text-ubt-grey"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="p-4 text-sm">
          <p>No network connections configured.</p>
        </div>
      </div>
    </div>
  </Modal>
);

export default NetworkEditor;
