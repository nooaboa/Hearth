import Link from "next/link";
import { AttendanceTable } from "./table";
import { filterAttendance, loadAttendance, type AttendanceRelation } from "@/lib/attendance";
import { databaseReady, db } from "@/lib/db";
import { formatWhen } from "@/lib/time";

const RELATIONS = new Set<AttendanceRelation>(["matched", "mismatch", "no_reply"]);

function optionalId(value: string | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string; circle?: string; meeting?: string; present?: string; relation?: string }>;
}) {
  if (!databaseReady()) return <p className="banner">Database key is missing.</p>;
  const query = await searchParams;
  const personId = optionalId(query.person);
  const circleId = optionalId(query.circle);
  const meetingId = optionalId(query.meeting);
  const present = query.present === "here" ? true : query.present === "away" ? false : undefined;
  const relation = RELATIONS.has(query.relation as AttendanceRelation) ? (query.relation as AttendanceRelation) : undefined;
  const [rows, people, circles] = await Promise.all([loadAttendance(), db.people(), db.circles()]);
  const nights = [...new Map(rows.map((row) => [row.meetingId, row])).values()];
  const shown = filterAttendance(rows, { personId, circleId, meetingId, present, relation });
  const here = shown.filter((row) => row.present).length;
  const away = shown.length - here;
  const linedUp = shown.filter((row) => row.relation === "matched").length;
  const off = shown.filter((row) => row.relation === "mismatch").length;
  const quiet = shown.filter((row) => row.relation === "no_reply").length;
  const filtered = Boolean(personId || circleId || meetingId || present !== undefined || relation);

  return (
    <>
      <p className="kicker">Checks</p>
      <h1>Attendance</h1>
      <p className="lede">Who was in the room, and how that lines up with the reply they sent.</p>
      <form className="card filters" method="get" action="/attendance">
        <label>
          Person
          <select name="person" defaultValue={personId ? String(personId) : ""}>
            <option value="">Anyone</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.full_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Circle
          <select name="circle" defaultValue={circleId ? String(circleId) : ""}>
            <option value="">Any circle</option>
            {circles.map((circle) => (
              <option key={circle.id} value={circle.id}>
                {circle.location || `Circle ${circle.id}`}
              </option>
            ))}
          </select>
        </label>
        <label>
          Night
          <select name="meeting" defaultValue={meetingId ? String(meetingId) : ""}>
            <option value="">Any night</option>
            {nights.map((night) => (
              <option key={night.meetingId} value={night.meetingId}>
                {night.meetingTitle} · {formatWhen(night.startsAt, night.timezone)}
              </option>
            ))}
          </select>
        </label>
        <label>
          There
          <select name="present" defaultValue={query.present === "here" || query.present === "away" ? query.present : ""}>
            <option value="">Here or away</option>
            <option value="here">Here</option>
            <option value="away">Away</option>
          </select>
        </label>
        <label>
          Lineup
          <select name="relation" defaultValue={relation ?? ""}>
            <option value="">Any lineup</option>
            <option value="matched">Lines up with the reply</option>
            <option value="mismatch">Reply and room disagree</option>
            <option value="no_reply">No reply on file</option>
          </select>
        </label>
        <div className="actions">
          <button className="primary" type="submit">
            Show
          </button>
          {filtered ? (
            <Link className="outline" href="/attendance">
              Clear
            </Link>
          ) : null}
        </div>
      </form>
      {rows.length === 0 ? (
        <p className="meta" style={{ marginTop: 18 }}>
          No attendance has been recorded yet. It is saved from a meeting page.
        </p>
      ) : (
        <>
          <div className="pills" style={{ margin: "18px 0" }}>
            <span className="pill yes">{here} here</span>
            <span className="pill no">{away} away</span>
            <span className="pill">{linedUp} line up</span>
            <span className="pill iris">{off} disagree</span>
            <span className="pill wait">{quiet} no reply</span>
          </div>
          {shown.length === 0 ? <p className="meta">Nothing matches this check.</p> : <AttendanceTable rows={shown} />}
        </>
      )}
    </>
  );
}
