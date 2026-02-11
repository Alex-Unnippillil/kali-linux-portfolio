import React from 'react';
import Modal from '../../../base/Modal';

interface NameModalProps {
  isOpen: boolean;
  playerName: string;
  setPlayerName: (name: string) => void;
  onClose: () => void;
  onSave: () => void;
}

const NameModal: React.FC<NameModalProps> = ({
  isOpen,
  playerName,
  setPlayerName,
  onClose,
  onSave,
}) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <div className="rounded bg-slate-900 p-4 text-sm text-slate-100 shadow-lg">
      <h3 className="text-base font-semibold">Save your score</h3>
      <p className="mt-1 text-xs text-slate-300">Enter a name for the leaderboard.</p>
      <input
        type="text"
        aria-label="Player name"
        className="mt-3 w-full rounded bg-slate-800 px-2 py-1"
        value={playerName}
        onChange={(event) => setPlayerName(event.target.value)}
        maxLength={16}
        placeholder="Player"
      />
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className="rounded bg-slate-700 px-3 py-1" onClick={onClose}>Cancel</button>
        <button type="button" className="rounded bg-emerald-500 px-3 py-1 text-slate-900" onClick={onSave}>Save</button>
      </div>
    </div>
  </Modal>
);

export default NameModal;
