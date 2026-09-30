import { db, type AttendanceMark, type AttendanceReport, type Circle, type Meeting, type Person, type Rsvp } from "./db";

export type AttendanceRelation = "matched" | "mismatch" | "no_reply";

export type AttendanceRow = {
  markId: number;
  personId: number;
  personName: string;
  present: boolean;
  notes: string;
  submittedAt: string;
  meetingId: number;
  meetingTitle: string;
  startsAt: string;
  circleId: number;
  circleLabel: string;
  timezone: string;
  rsvp: "yes" | "no" | null;
  relation: AttendanceRelation;
  relationLabel: string;
};

export function relationFor(present: boolean, rsvp: "yes" | "no" | null) {
  if (!rsvp) {
    return {
      relation: "no_reply" as const,
      relationLabel: present ? "No reply, came" : "No reply, missed",
    };
  }
  if (present && rsvp === "yes") return { relation: "matched" as const, relationLabel: "Said yes, came" };
  if (!present && rsvp === "no") return { relation: "matched" as const, relationLabel: "Said no, stayed away" };
  if (present && rsvp === "no") return { relation: "mismatch" as const, relationLabel: "Said no, came" };
  return { relation: "mismatch" as const, relationLabel: "Said yes, missed" };
}

export function buildAttendanceRows(input: {
  marks: AttendanceMark[];
  reports: AttendanceReport[];
  meetings: Meeting[];
  circles: Circle[];
  people: Person[];
  rsvps: Rsvp[];
}): AttendanceRow[] {
  const reportById = new Map(input.reports.map((report) => [report.id, report]));
  const meetingById = new Map(input.meetings.map((meeting) => [meeting.id, meeting]));
  const circleById = new Map(input.circles.map((circle) => [circle.id, circle]));
  const personById = new Map(input.people.map((person) => [person.id, person]));
  const rsvpByKey = new Map(input.rsvps.map((rsvp) => [`${rsvp.person_id}:${rsvp.meeting_id}`, rsvp.status]));

  const rows: AttendanceRow[] = [];
  for (const mark of input.marks) {
    const report = reportById.get(mark.report_id);
    const meeting = report ? meetingById.get(report.meeting_id) : undefined;
    if (!report || !meeting) continue;
    const circle = circleById.get(meeting.circle_id);
    const rsvp = rsvpByKey.get(`${mark.person_id}:${meeting.id}`) ?? null;
    const lineup = relationFor(mark.present === true, rsvp);
    rows.push({
      markId: mark.id,
      personId: mark.person_id,
      personName: personById.get(mark.person_id)?.full_name ?? `Person ${mark.person_id}`,
      present: mark.present === true,
      notes: report.notes?.trim() ?? "",
      submittedAt: report.submitted_at,
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      startsAt: meeting.starts_at,
      circleId: meeting.circle_id,
      circleLabel: circle?.location || `Circle ${meeting.circle_id}`,
      timezone: circle?.timezone || "America/New_York",
      rsvp,
      relation: lineup.relation,
      relationLabel: lineup.relationLabel,
    });
  }
  rows.sort((a, b) => b.startsAt.localeCompare(a.startsAt) || a.personName.localeCompare(b.personName));
  return rows;
}

export async function loadAttendance(personId?: number) {
  const marks = await db.attendanceMarks(personId);
  if (!marks.length) return [];
  const reports = await db.attendanceReportsByIds([...new Set(marks.map((mark) => mark.report_id))]);
  const meetingIds = [...new Set(reports.map((report) => report.meeting_id))];
  const [meetings, people, circles, rsvps] = await Promise.all([
    db.meetingsByIds(meetingIds),
    db.people(),
    db.circles(),
    db.rsvpsForMeetings(meetingIds),
  ]);
  return buildAttendanceRows({ marks, reports, meetings, people, circles, rsvps });
}

export function filterAttendance(
  rows: AttendanceRow[],
  query: { personId?: number; circleId?: number; meetingId?: number; present?: boolean; relation?: AttendanceRelation },
) {
  return rows.filter((row) => {
    if (query.personId && row.personId !== query.personId) return false;
    if (query.circleId && row.circleId !== query.circleId) return false;
    if (query.meetingId && row.meetingId !== query.meetingId) return false;
    if (query.present !== undefined && row.present !== query.present) return false;
    if (query.relation && row.relation !== query.relation) return false;
    return true;
  });
}
