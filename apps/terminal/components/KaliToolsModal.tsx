import React from 'react';
import Modal from '../../../components/base/Modal';

interface Info {
  description: string;
  tools: string[];
}

interface Props {
  category: string;
  info: Info;
  onClose: () => void;
}

const KaliToolsModal: React.FC<Props> = ({ category, info, onClose }) => {
  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="bg-gray-800 text-white p-4 rounded max-w-md">
        <h2 className="text-xl mb-2">{`kali-tools-${category}`}</h2>
        <p className="mb-2">{info.description}</p>
        <ul className="list-disc pl-5 max-h-60 overflow-y-auto text-sm">
          {info.tools.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <div className="mt-4 text-right">
          <button
            className="px-3 py-1 bg-blue-600 rounded"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default KaliToolsModal;
