import Link from "next/link";
import { databaseReady, db, type Circle, type Meeting, type Person, type Rsvp } from "@/lib/db";
import { formatWhen } from "@/lib/time";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const params = await searchParams;
  if (!databaseReady()) {
    return <Setup />;
  }
  const now = new Date();
  const until = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const [meetings, circles, people, members] = await Promise.all([
    db.meetingsSoon(now.toISOString(), until.toISOString()),
    db.circles(),
    db.people(),
    db.members(),
  ]);
  const rsvps = await db.rsvpsForMeetings(meetings.map((meeting) => meeting.id));
  const circleById = new Map(circles.map((circle) => [circle.id, circle]));
  const personById = new Map(people.map((person) => [person.id, person]));

  return (
    <>
      <p className="kicker">This fortnight</p>
      <h1>Who is around the table.</h1>
      <p className="lede">Circles meeting in the next two weeks, with who is in, out, or still quiet.</p>
      {params.sent ? <p className="banner">Sent to n8n.</p> : null}
      <div className="cards">
        {meetings.length === 0 ? <article className="card">No meetings in the next two weeks.</article> : null}
        {meetings.map((meeting) => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            circle={circleById.get(meeting.circle_id)}
            people={personById}
            members={members.filter((member) => member.circle_id === meeting.circle_id && member.status === "active")}
            rsvps={rsvps.filter((rsvp) => rsvp.meeting_id === meeting.id)}
          />
        ))}
      </div>
    </>
  );
}

function MeetingCard({
  meeting,
  circle,
  people,
  members,
  rsvps,
}: {
  meeting: Meeting;
  circle?: Circle;
  people: Map<number, Person>;
  members: { person_id: number }[];
  rsvps: Rsvp[];
}) {
  const zone = circle?.timezone || "America/New_York";
  const byPerson = new Map(rsvps.map((rsvp) => [rsvp.person_id, rsvp]));
  const yes = members.filter((member) => byPerson.get(member.person_id)?.status === "yes").length;
  const no = members.filter((member) => byPerson.get(member.person_id)?.status === "no").length;
  const quiet = members.length - yes - no;
  const sentences = rsvps.filter((rsvp) => rsvp.interpreted);
  return (
    <article className="card">
      <div className="row">
        <div>
          <h2>
            <Link href={`/meetings/${meeting.id}`}>{meeting.title}</Link>
          </h2>
          <p className="meta">
            {formatWhen(meeting.starts_at, zone)} · {meeting.location || circle?.location || "Place not set"}
          </p>
        </div>
        <div className="pills">
          <span className="pill yes">{yes} in</span>
          <span className="pill no">{no} out</span>
          <span className="pill wait">{quiet} no reply</span>
        </div>
      </div>
      {sentences.length ? (
        <div style={{ marginTop: 12 }}>
          {sentences.map((rsvp) => (
            <p key={rsvp.id} className="meta">
              {people.get(rsvp.person_id)?.full_name}: “{rsvp.raw_reply}” read as {rsvp.status}
            </p>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function Setup() {
  return (
    <>
      <p className="kicker">Almost ready</p>
      <h1>The desk needs the database key.</h1>
      <p className="lede">
        Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to operator/.env.local. The key stays on the server. Members never see it.
      </p>
    </>
  );
}
