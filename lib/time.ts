export const WEEKDAYS = [
  { value: 1, label: "Monday", window: "7:00–9:00 pm" },
  { value: 2, label: "Tuesday", window: "7:00–9:00 pm" },
  { value: 3, label: "Wednesday", window: "7:00–9:00 pm" },
  { value: 4, label: "Thursday", window: "7:00–9:00 pm" },
  { value: 6, label: "Saturday", window: "11:30–1:30 or 2:30–4:30" },
  { value: 7, label: "Sunday", window: "11:30–1:30 or 2:30–4:30" },
] as const;

export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
];

export const WINDOWS: Record<number, { start: string; end: string; label: string }[]> = {
  1: [{ start: "19:00", end: "21:00", label: "7:00–9:00 pm" }],
  2: [{ start: "19:00", end: "21:00", label: "7:00–9:00 pm" }],
  3: [{ start: "19:00", end: "21:00", label: "7:00–9:00 pm" }],
  4: [{ start: "19:00", end: "21:00", label: "7:00–9:00 pm" }],
  6: [
    { start: "11:30", end: "13:30", label: "11:30 am–1:30 pm" },
    { start: "14:30", end: "16:30", label: "2:30–4:30 pm" },
  ],
  7: [
    { start: "11:30", end: "13:30", label: "11:30 am–1:30 pm" },
    { start: "14:30", end: "16:30", label: "2:30–4:30 pm" },
  ],
};

export function weekdayLabel(value: number | null) {
  return WEEKDAYS.find((day) => day.value === value)?.label ?? "Weekday not set";
}

export function patternLabel(value: string | null) {
  if (value === "week_1_3") return "1st and 3rd";
  if (value === "week_2_4") return "2nd and 4th";
  return "Pattern not set";
}

export function clockLabel(value: string | null) {
  if (!value) return "";
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function monthDayYear(value: string | null) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${month.padStart(2, "0")}/${day.padStart(2, "0")}/${year}`;
}

function calendarIso(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const check = new Date(`${iso}T00:00:00Z`);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) return null;
  return iso;
}

export function parseUsDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  return calendarIso(Number(match[3]), Number(match[1]), Number(match[2]));
}

export function parseUsDateTimeLocal(value: string) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (!match) return null;
  const date = calendarIso(Number(match[3]), Number(match[1]), Number(match[2]));
  if (!date) return null;
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  const period = match[6].toUpperCase();
  if (period === "AM") hour = hour === 12 ? 0 : hour;
  else hour = hour === 12 ? 12 : hour + 12;
  return `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function zonedParts(iso: string, timeZone: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
}

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function formatWhen(iso: string, timeZone: string) {
  const parts = zonedParts(iso, timeZone);
  if (!parts) return iso;
  const period = readPart(parts, "dayPeriod");
  return `${readPart(parts, "weekday")}, ${readPart(parts, "month")}/${readPart(parts, "day")}/${readPart(parts, "year")}, ${readPart(parts, "hour")}:${readPart(parts, "minute")}${period ? ` ${period}` : ""}`;
}

export function usDateTimeInput(iso: string, timeZone: string) {
  const parts = zonedParts(iso, timeZone);
  if (!parts) return "";
  const period = readPart(parts, "dayPeriod");
  return `${readPart(parts, "month")}/${readPart(parts, "day")}/${readPart(parts, "year")}, ${readPart(parts, "hour")}:${readPart(parts, "minute")}${period ? ` ${period}` : ""}`;
}

export function localInputToUtc(local: string, timeZone: string) {
  const [date, time] = local.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(guess);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const rendered = Date.UTC(read("year"), read("month") - 1, read("day"), read("hour"), read("minute"));
  return new Date(guess.getTime() - (rendered - guess.getTime())).toISOString();
}

export const TOUCH_LABELS: Record<string, string> = {
  t5_email: "Five-day email",
  t3_sms: "Three-day text",
  t1_sms: "Day-before text",
  t4h_sms: "Location text",
  feedback_baseline: "Season baseline",
  feedback_trial: "Trial feedback",
  feedback_short: "Short feedback",
  feedback_long: "Long feedback",
  facilitator: "Facilitator email",
  welcome: "Welcome",
};
