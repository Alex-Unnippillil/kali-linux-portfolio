export type CalendarView = 'month' | 'week' | 'agenda';

export type CalendarCategory = 'work' | 'personal' | 'reminder' | 'travel';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  category?: CalendarCategory;
}

export interface GroupedEvents {
  date: Date;
  events: CalendarEvent[];
}
