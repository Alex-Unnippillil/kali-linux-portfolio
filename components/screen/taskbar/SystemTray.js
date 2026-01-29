import React from 'react';
import Status from '../../util-components/status';
import QuickSettings from '../../ui/QuickSettings';
import PerformanceGraph from '../../ui/PerformanceGraph';
import TaskbarClock from './TaskbarClock';

const SystemTray = ({
        children,
        statusCardOpen,
        onStatusToggle,
        onStatusKeyDown,
}) => (
        <div className="flex items-center gap-4 text-xs md:text-sm">
                <PerformanceGraph />
                <TaskbarClock />
                <div
                        id="status-bar"
                        role="button"
                        tabIndex={0}
                        aria-label="System status"
                        aria-expanded={statusCardOpen}
                        onClick={onStatusToggle}
                        onKeyDown={onStatusKeyDown}
                        className={
                                'relative rounded-full border border-transparent px-3 py-1 text-xs font-medium text-white/80 transition duration-150 ease-in-out hover:border-white/20 hover:bg-white/10 focus:border-ubb-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300'
                        }
                >
                        <Status />
                        <QuickSettings open={statusCardOpen} />
                </div>
                {children}
        </div>
);

export default SystemTray;
