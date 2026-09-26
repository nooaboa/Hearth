import Link from "next/link";
import { notFound } from "next/navigation";
import { moveMeeting, saveAttendance } from "@/lib/actions";
import { databaseReady, db } from "@/lib/db";
import { TOUCH_LABELS, formatWhen, toLocalInput } from "@/lib/time";

export default async function MeetingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  if (!databaseReady()) return <p className="banner">Database key is missing.</p>;
  const { id } = await params;
  const query = await searchParams;
  const meeting = await db.meeting(Number(id));
  if (!meeting) notFound();
  const circle = await db.circle(meeting.circle_id);
  if (!circle) notFound();
  const zone = circle.timezone || "America/New_York";
  const [members, people, rsvps, sends, feedback] = await Promise.all([
    db.members(circle.id),
    db.people(),
    db.rsvpsForMeetings([meeting.id]),
    db.sendsForMeeting(meeting.id),
    db.feedbackForMeeting(meeting.id),
  ]);
  const personById = new Map(people.map((person) => [person.id, person]));
  const active = members.filter((member) => member.status === "active");
  const rsvpByPerson = new Map(rsvps.map((rsvp) => [rsvp.person_id, rsvp]));

  return (
    <>
      <Link className="back" href={`/circles/${circle.id}`}>
        ← {circle.location || `Circle ${circle.id}`}
      </Link>
      <p className="kicker">Meeting</p>
      <h1>{meeting.title}</h1>
      <p className="lede">
        {formatWhen(meeting.starts_at, zone)} · {meeting.location || circle.location}
      </p>
      {query.sent ? <p className="banner">Sent to n8n.</p> : null}
      <div className="split">
        <div className="cards">
          <article className="card" style={{ overflowX: "auto" }}>
            <h2>Replies</h2>
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>RSVP</th>
                  <th>What they wrote</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {active.map((member) => {
                  const person = personById.get(member.person_id);
                  const rsvp = rsvpByPerson.get(member.person_id);
                  const theirs = sends.filter((send) => send.person_id === member.person_id);
                  return (
                    <tr key={member.id}>
                      <td>{person?.full_name}</td>
                      <td>{rsvp ? rsvp.status : "no reply"}</td>
                      <td>
                        {rsvp?.raw_reply || "—"}
                        {rsvp?.interpreted ? <div className="meta">Read from a sentence</div> : null}
                        {rsvp && !rsvp.interpreted ? <div className="meta">Exact 1 or 2</div> : null}
                      </td>
                      <td>{theirs.map((send) => TOUCH_LABELS[send.touch] || send.touch).join(", ") || "Nothing yet"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </article>
          <article className="card">
            <h2>Feedback</h2>
            {feedback.length === 0 ? <p className="meta">No answers for this meeting yet.</p> : null}
            {feedback.map((row) => (
              <p key={row.id} style={{ marginTop: 10 }}>
                <strong>{personById.get(row.person_id)?.full_name}</strong> · {row.form}
                <span className="meta"> {JSON.stringify(row.answers)}</span>
              </p>
            ))}
          </article>
        </div>
        <div className="cards">
          <form className="card stack" action={moveMeeting}>
            <h2>Move this night</h2>
            <p className="meta">This occurrence only. Times are in {zone}.</p>
            <input type="hidden" name="meeting_id" value={meeting.id} />
            <input type="hidden" name="timezone" value={zone} />
            <label>
              Starts
              <input name="starts_at" type="datetime-local" required defaultValue={toLocalInput(meeting.starts_at, zone)} />
            </label>
            <label>
              Ends
              <input
                name="ends_at"
                type="datetime-local"
                required
                defaultValue={toLocalInput(meeting.ends_at || meeting.starts_at, zone)}
              />
            </label>
            <label>
              Place
              <input name="location" defaultValue={meeting.location || circle.location || ""} />
            </label>
            <button className="primary" type="submit">
              Move meeting
            </button>
          </form>
          <form className="card stack" action={saveAttendance}>
            <h2>Who was there</h2>
            <input type="hidden" name="meeting_id" value={meeting.id} />
            <input type="hidden" name="facilitator_id" value={circle.facilitator_id ?? ""} />
            {active.map((member) => (
              <label className="check" key={member.id}>
                <input type="hidden" name="person_id" value={member.person_id} />
                <input type="checkbox" name={`present_${member.person_id}`} defaultChecked />
                {personById.get(member.person_id)?.full_name}
              </label>
            ))}
            <label>
              Note
              <textarea name="notes" />
            </label>
            <button className="primary" type="submit">
              Save attendance
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
