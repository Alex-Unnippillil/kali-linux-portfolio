import React from 'react';
import dynamic from 'next/dynamic';

const TwitterTimeline = dynamic(
    () => import('react-twitter-embed').then(m => m.TwitterTimelineEmbed),
    {
        ssr: false,
        loading: () => (
            <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
                Loading...
            </div>
        ),
    }
);

export default function XApp() {
    return (
        <div className="h-full w-full bg-ub-cool-grey">
            <TwitterTimeline
                sourceType="profile"
                screenName="AUnnippillil"
                options={{ height: '1200%' }}
            />
        </div>
    );
}

export const displayX = () => <XApp />;

=======
