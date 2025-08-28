import React, { useEffect, useRef } from 'react';
const Toast = ({ message, actionLabel, onAction, onClose, duration = 6000, }) => {
    const timeoutRef = useRef(null);
    useEffect(() => {
        timeoutRef.current = setTimeout(() => {
            onClose && onClose();
        }, duration);
        return () => {
            if (timeoutRef.current)
                clearTimeout(timeoutRef.current);
        };
    }, [duration, onClose]);
    return (<div role="alert" aria-live="assertive" className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-4 py-2 rounded shadow-md flex items-center">
      <span>{message}</span>
      {onAction && actionLabel && (<button onClick={onAction} className="ml-4 underline focus:outline-none">
          {actionLabel}
        </button>)}
    </div>);
};
export default Toast;
