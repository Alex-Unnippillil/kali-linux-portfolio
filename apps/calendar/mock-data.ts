import { addDays, startOfDay } from './date-utils';
import { CalendarEvent } from './types';

function setTime(base: Date, hours: number, minutes = 0): Date {
  const date = new Date(base);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

const today = startOfDay(new Date());

function createEvent(
  id: string,
  offset: number,
  startHour: number,
  durationHours: number,
  details: Omit<CalendarEvent, 'id' | 'start' | 'end'>,
  startMinutes = 0,
): CalendarEvent {
  const startDate = setTime(addDays(today, offset), startHour, startMinutes);
  const endDate = new Date(startDate);
  endDate.setHours(startDate.getHours() + durationHours);
  return {
    id,
    start: startDate,
    end: endDate,
    ...details,
  };
}

export const mockEvents: CalendarEvent[] = [
  createEvent('team-sync', 0, 9, 1, {
    title: 'Daily Stand-up',
    location: 'Ops Briefing Room',
    description: 'Short sync to review red team findings and blue team responses.',
    category: 'work',
  }, 30),
  createEvent('intel-brief', 1, 10, 2, {
    title: 'Threat Intel Briefing',
    location: 'Situation Room',
    description:
      'Review latest advisories, share intel about emerging vulnerabilities, and assign action items.',
    category: 'work',
  }),
  createEvent('training-lab', 2, 14, 1, {
    title: 'Purple Team Lab',
    location: 'Lab 3',
    description: 'Hands-on lab simulating lateral movement with mitigations.',
    category: 'work',
  }, 30),
  createEvent('fitness', -2, 7, 1, {
    title: 'Morning Run',
    location: 'Waterfront Trail',
    description: '3 mile tempo run to reset before the incident response rotation.',
    category: 'personal',
  }),
  createEvent('capture-flag', 5, 18, 3, {
    title: 'CTF League Night',
    location: 'Hackerspace',
    description: 'Friendly capture the flag exercises focusing on web exploits.',
    category: 'personal',
  }),
  {
    id: 'conference',
    title: 'Blue Team Summit',
    start: setTime(addDays(today, 7), 9),
    end: setTime(addDays(today, 9), 16),
    location: 'Baltimore Convention Center',
    description:
      'Multi-day summit covering detection engineering, incident command, and post-incident recovery.',
    category: 'work',
  },
  {
    id: 'travel',
    title: 'Travel to Summit',
    start: setTime(addDays(today, 6), 13, 30),
    end: setTime(addDays(today, 6), 18, 30),
    location: 'BWI Airport',
    description: 'Flight and transit time ahead of the Blue Team Summit.',
    category: 'travel',
  },
  createEvent('retro', -7, 11, 1, {
    title: 'Incident Retro',
    location: 'Ops Briefing Room',
    description: 'Lessons learned from last week’s simulated ransomware drill.',
    category: 'work',
  }, 30),
  createEvent('mentor', 3, 16, 1, {
    title: 'Mentorship 1:1',
    location: 'Video Call',
    description: 'Coaching session with new analysts on alert triage techniques.',
    category: 'work',
  }),
  createEvent('dinner', 4, 19, 2, {
    title: 'Team Dinner',
    location: 'Signal Station Bistro',
    description: 'Celebrating milestone for the portfolio launch.',
    category: 'personal',
  }),
];

