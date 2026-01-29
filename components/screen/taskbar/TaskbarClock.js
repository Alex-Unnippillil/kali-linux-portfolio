import React from 'react';
import Clock from '../../util-components/clock';

const TaskbarClock = () => (
        <Clock onlyTime={true} showCalendar={true} hour12={false} variant="minimal" />
);

export default TaskbarClock;
