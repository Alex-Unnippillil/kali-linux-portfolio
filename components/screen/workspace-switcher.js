import React from 'react';

export default function WorkspaceSwitcher({ workspaces, activeIndex, switcherIndex, onSelect }) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 transition-opacity duration-200">
            <div className="flex space-x-4">
                {workspaces.map((ws, idx) => {
                    const isSelected = idx === switcherIndex;
                    const border = isSelected ? 'border-blue-400' : (idx === activeIndex ? 'border-gray-400' : 'border-transparent');
                    const scale = isSelected ? 'scale-110' : 'scale-100';
                    return (
                        <div
                            key={idx}
                            onClick={() => onSelect(idx)}
                            className={`border-2 ${border} rounded-md p-2 bg-ub-cool-grey text-white cursor-pointer transition-transform duration-200 transform ${scale}`}
                        >
                            <div className="text-xs mb-2">Workspace {idx + 1}</div>
                            <div className="grid grid-cols-3 gap-1">
                                {ws.map(id => (
                                    <div key={id} className="w-8 h-5 bg-black bg-opacity-40" />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
