import React, { useMemo } from 'react';
import Grid from '../apps/Grid';

const AllApplications = ({ apps = [], games = [], openApp }) => {
    const combined = useMemo(() => {
        const seen = new Set();
        const items = [];
        [...apps, ...games].forEach((app) => {
            if (!app || typeof app.id !== 'string') return;
            if (seen.has(app.id)) return;
            seen.add(app.id);
            items.push(app);
        });
        return items;
    }, [apps, games]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center overflow-hidden bg-ub-grey bg-opacity-95 all-apps-anim">
            <Grid apps={combined} openApp={openApp} />
        </div>
    );
};

export default AllApplications;
