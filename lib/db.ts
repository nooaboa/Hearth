export type Person = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
};

export type Circle = {
  id: number;
  kind: "new" | "existing";
  status: "proposed" | "confirmed" | "active" | "ended";
  pattern: "week_1_3" | "week_2_4" | null;
  weekday: number | null;
  local_start: string | null;
  local_end: string | null;
  timezone: string | null;
  location: string | null;
  facilitator_id: number | null;
  host_id: number | null;
  season_start: string | null;
  season_end: string | null;
};

export type Member = {
  id: number;
  circle_id: number;
  person_id: number;
  status: "proposed" | "active" | "dropped";
  drop_reason: string | null;
  left_at: string | null;
};

export type Meeting = {
  id: number;
  circle_id: number;
  meeting_number: number;
  starts_at: string;
  ends_at: string | null;
  title: string;
  location: string | null;
  title_kind: string;
  series: string;
  calendar_event_id: string | null;
};

export type Rsvp = {
  id: number;
  person_id: number;
  meeting_id: number;
  status: "yes" | "no";
  raw_reply: string | null;
  interpreted: boolean;
};

export type Send = {
  id: number;
  person_id: number;
  circle_id: number;
  meeting_id: number | null;
  touch: string;
  channel: string;
  sent_at: string;
  season_key: string | null;
};

export type Consent = {
  person_id: number;
  channel: string;
  event: string;
  occurred_at: string;
  disclosure_text: string | null;
};

export type Feedback = {
  id: number;
  person_id: number;
  meeting_id: number | null;
  form: string;
  answers: Record<string, unknown>;
  submitted_at: string;
  season_key: string | null;
};

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to operator/.env.local.");
  }
  return { url: url.replace(/\/$/, ""), key };
}

export function databaseReady() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    let message = text;
    try {
      const body = JSON.parse(text) as { message?: string };
      message = body.message ?? text;
    } catch {
      message = text;
    }
    throw new Error(message || `Supabase returned ${response.status}`);
  }
  return (text ? JSON.parse(text) : null) as T;
}

export const db = {
  people: () => rest<Person[]>("people?select=id,full_name,email,phone&order=full_name.asc"),
  person: (id: number) =>
    rest<Person[]>(`people?id=eq.${id}&select=id,full_name,email,phone`).then((rows) => rows[0] ?? null),
  circles: () =>
    rest<Circle[]>("circles?select=*&order=season_start.desc.nullslast,id.desc"),
  circle: (id: number) => rest<Circle[]>(`circles?id=eq.${id}&select=*`).then((rows) => rows[0] ?? null),
  members: (circleId?: number) => {
    const filter = circleId ? `&circle_id=eq.${circleId}` : "";
    return rest<Member[]>(`circle_members?select=*${filter}&order=status.asc`);
  },
  meetingsSoon: (fromIso: string, toIso: string) =>
    rest<Meeting[]>(
      `meetings?starts_at=gte.${encodeURIComponent(fromIso)}&starts_at=lt.${encodeURIComponent(toIso)}&select=*&order=starts_at.asc`,
    ),
  meetingsForCircle: (circleId: number) =>
    rest<Meeting[]>(`meetings?circle_id=eq.${circleId}&select=*&order=starts_at.asc`),
  meeting: (id: number) => rest<Meeting[]>(`meetings?id=eq.${id}&select=*`).then((rows) => rows[0] ?? null),
  rsvpsForMeetings: (ids: number[]) => {
    if (!ids.length) return Promise.resolve([] as Rsvp[]);
    return rest<Rsvp[]>(`rsvps?meeting_id=in.(${ids.join(",")})&select=*`);
  },
  sendsForMeeting: (meetingId: number) =>
    rest<Send[]>(`sends?meeting_id=eq.${meetingId}&select=*&order=sent_at.desc`),
  consentForPerson: (personId: number) =>
    rest<Consent[]>(
      `consent_events?person_id=eq.${personId}&select=person_id,channel,event,occurred_at,disclosure_text&order=occurred_at.desc`,
    ),
  smsOptIns: () => rest<{ person_id: number }[]>("sms_opted_in?select=person_id"),
  emailOptOuts: () => rest<{ person_id: number }[]>("email_opted_out?select=person_id"),
  feedbackForMeeting: (meetingId: number) =>
    rest<Feedback[]>(`feedback_responses?meeting_id=eq.${meetingId}&select=*&order=submitted_at.desc`),
  insert: <T>(table: string, body: unknown) =>
    rest<T[]>(table, { method: "POST", body: JSON.stringify(body) }).then((rows) => rows[0]),
  updatePerson: (id: number, body: unknown) =>
    rest<Person[]>(`people?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(body) }).then((rows) => rows[0]),
  updateCircle: (id: number, body: unknown) =>
    rest<Circle[]>(`circles?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(body) }).then((rows) => rows[0]),
  remove: (table: string, id: number) => rest<unknown>(`${table}?id=eq.${id}`, { method: "DELETE" }),
  removeWhere: (table: string, filter: string) => rest<unknown>(`${table}?${filter}`, { method: "DELETE" }),
  clearRole: (column: "facilitator_id" | "host_id", personId: number) =>
    rest<unknown>(`circles?${column}=eq.${personId}`, { method: "PATCH", body: JSON.stringify({ [column]: null }) }),
};
