import Link from "next/link";
import { databaseReady, db, type Circle, type Meeting, type Person, type Send } from "@/lib/db";
import { TOUCH_LABELS, formatWhen, monthDayYear } from "@/lib/time";

export default async function NotificationsPage() {
  if (!databaseReady()) return <p className="banner">Database key is missing.</p>;
  const [sends, people, circles] = await Promise.all([db.sends(), db.people(), db.circles()]);
  const meetingIds = [...new Set(sends.flatMap((send) => (send.meeting_id ? [send.meeting_id] : [])))];
  const meetings = await db.meetingsByIds(meetingIds);
  const personById = new Map(people.map((person) => [person.id, person]));
  const circleById = new Map(circles.map((circle) => [circle.id, circle]));
  const meetingById = new Map(meetings.map((meeting) => [meeting.id, meeting]));
  const emails = sends.filter((send) => send.channel === "email").length;
  const texts = sends.filter((send) => send.channel === "sms").length;

  return (
    <>
      <p className="kicker">Notifications</p>
      <h1>What went out.</h1>
      <p className="lede">
        {sends.length === 0
          ? "Every email and text the desk sends will show up here."
          : `${countPhrase(emails, "email")} and ${countPhrase(texts, "text")}, newest first.`}
      </p>
      <div className="cards">
        {sends.length === 0 ? <article className="card">Nothing has gone out yet.</article> : null}
        {sends.map((send) => (
          <SendCard
            key={send.id}
            send={send}
            person={personById.get(send.person_id)}
            circle={circleById.get(send.circle_id)}
            meeting={send.meeting_id ? meetingById.get(send.meeting_id) : undefined}
          />
        ))}
      </div>
    </>
  );
}

function SendCard({
  send,
  person,
  circle,
  meeting,
}: {
  send: Send;
  person?: Person;
  circle?: Circle;
  meeting?: Meeting;
}) {
  const zone = circle?.timezone || "America/New_York";
  const email = send.channel === "email";
  const destination = email ? person?.email || "No email on file" : person?.phone || "No phone on file";
  const place = circle?.location || (circle ? `Circle ${circle.id}` : null);
  return (
    <article className="card">
      <div className="row">
        <div>
          <strong>
            {person ? <Link href={`/people/${person.id}`}>{person.full_name}</Link> : `Person ${send.person_id}`}
          </strong>
          <p className="meta">{destination}</p>
        </div>
        <span className={email ? "pill iris" : "pill wait"}>{email ? "Email" : "SMS"}</span>
      </div>
      <p style={{ marginTop: 10 }}>{TOUCH_LABELS[send.touch] || send.touch}</p>
      <p className="meta">
        {formatWhen(send.sent_at, zone)}
        {place ? (
          <>
            {" "}
            · {circle ? <Link href={`/circles/${circle.id}`}>{place}</Link> : place}
          </>
        ) : null}
        {meeting ? (
          <>
            {" "}
            · <Link href={`/meetings/${meeting.id}`}>{meeting.title}</Link>
          </>
        ) : null}
        {!meeting && send.season_key ? ` · ${seasonKeyLabel(send.season_key)}` : null}
      </p>
    </article>
  );
}

function countPhrase(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function seasonKeyLabel(key: string) {
  const match = key.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? `Season ${monthDayYear(match[1])}` : key;
}
