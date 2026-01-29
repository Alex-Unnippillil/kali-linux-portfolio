import React from 'react';
import Image from 'next/image';
import TaskbarRunningIndicator from './TaskbarRunningIndicator';

const TaskbarButton = ({
        app,
        badgeNode,
        buttonLabel,
        isActive,
        isFocused,
        onClick,
        onKeyDown,
        onMouseEnter,
        onMouseLeave,
        onFocus,
        onBlur,
}) => (
        <button
                type="button"
                aria-label={buttonLabel}
                aria-pressed={isActive}
                data-context="taskbar"
                data-app-id={app.id}
                data-active={isActive ? 'true' : 'false'}
                onClick={onClick}
                onKeyDown={onKeyDown}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onFocus={onFocus}
                onBlur={onBlur}
                className={`${isFocused ? 'bg-white/20' : 'bg-transparent'} relative flex items-center gap-2 rounded-md px-2 py-1 text-xs text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)]`}
        >
                <span className="relative inline-flex items-center justify-center">
                        <Image
                                src={app.icon}
                                alt=""
                                width={28}
                                height={28}
                                className="h-6 w-6"
                        />
                        {badgeNode}
                        {isActive && <TaskbarRunningIndicator />}
                </span>
                <span className="hidden whitespace-nowrap text-white md:inline">{app.title}</span>
        </button>
);

export default TaskbarButton;
