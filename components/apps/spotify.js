import React from 'react';
import { TwitterTimelineEmbed } from 'react-twitter-embed';

export default function x() {
    return (
        <div className="h-full w-full bg-ub-cool-grey">
            <TwitterTimelineEmbed
                sourceType="profile"
                screenName="AUnnippillil"
                options={{height: '1200%'}}
            />
        </div>
    );
}