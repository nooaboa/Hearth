import Link from "next/link";
import { notFound } from "next/navigation";
import { addMember, dropMember, launchCircle } from "@/lib/actions";
import { databaseReady, db } from "@/lib/db";
import { formatWhen, patternLabel, weekdayLabel } from "@/lib/time";

export default async function CirclePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  if (!databaseReady()) return <p className="banner">Database key is missing.</p>;
  const { id } = await params;
  const query = await searchParams;
  const circle = await db.circle(Number(id));
  if (!circle) notFound();
  const [members, people, meetings] = await Promise.all([
    db.members(circle.id),
    db.people(),
    db.meetingsForCircle(circle.id),
  ]);
  const personById = new Map(people.map((person) => [person.id, person]));
  const seated = new Set(members.filter((member) => member.status !== "dropped").map((member) => member.person_id));
  const available = people.filter((person) => !seated.has(person.id));
  const active = members.filter((member) => member.status === "active");

  return (
    <>
      <p className="kicker">{circle.kind} circle · {circle.status}</p>
      <h1>{circle.location || `Circle ${circle.id}`}</h1>
      <p className="lede">
        {weekdayLabel(circle.weekday)} · {patternLabel(circle.pattern)} · {circle.local_start}–{circle.local_end} · {circle.timezone}
        <br />
        Season {circle.season_start} to {circle.season_end}
      </p>
      {query.sent ? <p className="banner">Sent to n8n. Calendar rows appear after that workflow finishes.</p> : null}
      <div className="split">
        <div className="cards">
          <article className="card">
            <h2>Roster</h2>
            {members.map((member) => {
              const person = personById.get(member.person_id);
              return (
                <div className="row" key={member.id} style={{ marginTop: 12 }}>
                  <div>
                    <Link href={`/people/${member.person_id}`}>{person?.full_name}</Link>
                    <div className="meta">
                      {member.status}
                      {member.person_id === circle.facilitator_id ? " · facilitator" : ""}
                      {member.person_id === circle.host_id ? " · host" : ""}
                    </div>
                  </div>
                  {member.status === "active" ? (
                    <form action={dropMember} className="row">
                      <input type="hidden" name="circle_id" value={circle.id} />
                      <input type="hidden" name="person_id" value={member.person_id} />
                      <select name="drop_reason" defaultValue="manual">
                        <option value="leave_request">Asked to leave</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="manual">Manual</option>
                      </select>
                      <button className="ghost" type="submit">
                        Drop
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </article>
          <article className="card">
            <h2>Meetings</h2>
            {meetings.length === 0 ? <p className="meta">None yet. Launch the circle to create them.</p> : null}
            {meetings.map((meeting) => (
              <p key={meeting.id} style={{ marginTop: 10 }}>
                <Link href={`/meetings/${meeting.id}`}>
                  {meeting.meeting_number}. {meeting.title}
                </Link>
                <span className="meta"> · {formatWhen(meeting.starts_at, circle.timezone || "America/New_York")}</span>
              </p>
            ))}
          </article>
        </div>
        <div className="cards">
          <form className="card stack" action={addMember}>
            <h2>Add someone</h2>
            <input type="hidden" name="circle_id" value={circle.id} />
            <select name="person_id" required defaultValue="">
              <option value="" disabled>
                Choose
              </option>
              {available.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.full_name}
                </option>
              ))}
            </select>
            <button className="primary" type="submit">
              Add to roster
            </button>
          </form>
          {circle.status === "confirmed" ? (
            <form className="card stack" action={launchCircle}>
              <h2>Launch</h2>
              <p className="meta">
                {active.length} active. You confirm the size. n8n builds the intro meetings or the season series.
              </p>
              <input type="hidden" name="circle_id" value={circle.id} />
              <input type="hidden" name="kind" value={circle.kind} />
              <button className="primary" type="submit">
                {circle.kind === "existing" ? "Send season invites" : "Launch circle"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </>
  );
}
