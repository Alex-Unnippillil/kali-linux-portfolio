export type CalendarView = 'month' | 'week' | 'day';

export type CalendarCategory =
  | 'operations'
  | 'research'
  | 'community'
  | 'training'
  | 'maintenance'
  | 'personal';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  category?: CalendarCategory;
}
