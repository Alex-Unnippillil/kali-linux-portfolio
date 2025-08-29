import Image from 'next/image';
import { ModuleMetadata } from '../modules/metadata';

interface ModuleCardProps {
  module: ModuleMetadata;
  onSelect: (module: ModuleMetadata) => void;
  selected: boolean;
}

export default function ModuleCard({ module, onSelect, selected }: ModuleCardProps) {
  return (
    <button
      onClick={() => onSelect(module)}
      className={`w-full text-left border rounded p-3 flex items-start justify-between hover:bg-gray-50 focus:outline-none ${
        selected ? 'bg-gray-100' : ''
      }`}
    >
      <div className="flex-1 pr-2 font-mono">
        <h3 className="font-bold">{module.name}</h3>
        <p className="text-sm">{module.description}</p>
      </div>
      <div className="flex flex-col gap-2 items-center">
        <Image
          src="/themes/Yaru/status/about.svg"
          alt="Details"
          width={24}
          height={24}
        />
        <Image
          src="/themes/Yaru/status/download.svg"
          alt="Run"
          width={24}
          height={24}
        />
      </div>
    </button>
  );
}
