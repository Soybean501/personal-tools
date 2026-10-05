CREATE TABLE IF NOT EXISTS reminders (
 token TEXT PRIMARY KEY,
 subscription TEXT NOT NULL,
 morning TEXT NOT NULL DEFAULT '08:00',
 evening TEXT NOT NULL DEFAULT '19:00',
 timezone TEXT NOT NULL DEFAULT 'Europe/London',
 enabled INTEGER NOT NULL DEFAULT 1,
 last_morning TEXT,
 last_evening TEXT
);
