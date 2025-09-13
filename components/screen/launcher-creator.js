import React, { useState } from 'react';

function LauncherCreator({ onSave, onClose }) {
    const [name, setName] = useState('');
    const [comment, setComment] = useState('');
    const [icon, setIcon] = useState('');
    const [command, setCommand] = useState('');

    const handleSubmit = () => {
        if (!name || !command) return;
        onSave({ name, comment, icon, command });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ub-grey bg-opacity-95">
            <div className="bg-ub-cool-grey p-4 rounded w-80">
                <h2 className="text-white mb-4">Create Launcher</h2>
                <input
                    className="w-full mb-2 px-2 py-1 rounded bg-black bg-opacity-20 text-white focus:outline-none"
                    placeholder="Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
                <input
                    className="w-full mb-2 px-2 py-1 rounded bg-black bg-opacity-20 text-white focus:outline-none"
                    placeholder="Comment"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                />
                <input
                    className="w-full mb-2 px-2 py-1 rounded bg-black bg-opacity-20 text-white focus:outline-none"
                    placeholder="Icon URL"
                    value={icon}
                    onChange={e => setIcon(e.target.value)}
                />
                <input
                    className="w-full mb-4 px-2 py-1 rounded bg-black bg-opacity-20 text-white focus:outline-none"
                    placeholder="Command"
                    value={command}
                    onChange={e => setCommand(e.target.value)}
                />
                <div className="flex justify-end space-x-2">
                    <button
                        className="px-3 py-1 rounded bg-black bg-opacity-20 text-white"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-3 py-1 rounded bg-black bg-opacity-20 text-white"
                        onClick={handleSubmit}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LauncherCreator;
