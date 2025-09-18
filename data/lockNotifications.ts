export interface LockNotification {
  id: string;
  app: string;
  summary: string;
  message: string;
  timestamp: string;
  sensitive?: boolean;
}

export const lockNotifications: LockNotification[] = [
  {
    id: "mail-1",
    app: "Mail",
    summary: "New message from Maya",
    message: "Maya sent: Lunch is moved to 13:30 at the community lab.",
    timestamp: "2025-02-15T09:24:00",
    sensitive: true,
  },
  {
    id: "calendar-1",
    app: "Calendar",
    summary: "Stand-up starts in 5 minutes",
    message: "Daily stand-up with Red Team begins at 09:30 in War Room 2.",
    timestamp: "2025-02-15T09:25:00",
  },
  {
    id: "alerts-1",
    app: "Alerts",
    summary: "Lab sensors nominal",
    message: "Biosensor sweep complete — all vitals within tolerance thresholds.",
    timestamp: "2025-02-15T09:18:00",
  },
  {
    id: "messages-1",
    app: "Signal",
    summary: "2 new encrypted threads",
    message: "Nova: Reviewed your draft. Check the secure folder before publishing.",
    timestamp: "2025-02-15T09:12:00",
    sensitive: true,
  },
  {
    id: "tasks-1",
    app: "Tasks",
    summary: "Server patch window",
    message: "Apply patches to perimeter nodes between 22:00-23:30 tonight.",
    timestamp: "2025-02-15T08:55:00",
  },
];
