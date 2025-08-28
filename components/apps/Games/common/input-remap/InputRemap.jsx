import React, { useState } from 'react';
const InputRemap = ({ mapping, setKey, actions }) => {
    const [waiting, setWaiting] = useState(null);
    const [message, setMessage] = useState(null);
    const capture = (action) => {
        setWaiting(action);
        setMessage(null);
        const handler = (e) => {
            e.preventDefault();
            const conflict = setKey(action, e.key);
            if (conflict)
                setMessage(`Replaced ${conflict}`);
            else
                setMessage(null);
            setWaiting(null);
            window.removeEventListener('keydown', handler);
        };
        window.addEventListener('keydown', handler);
    };
    return (<div className="space-y-2">
      {Object.keys(actions).map((action) => (<div key={action} className="flex items-center justify-between">
          <span className="mr-2 capitalize">{action}</span>
          <button type="button" onClick={() => capture(action)} className="px-2 py-1 bg-gray-700 rounded focus:outline-none focus:ring">
            {waiting === action ? 'Press key...' : mapping[action]}
          </button>
        </div>))}
      {message && <div className="text-sm text-yellow-300">{message}</div>}
    </div>);
};
export default InputRemap;
