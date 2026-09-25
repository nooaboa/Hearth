import { notFound } from "next/navigation";
import { recordSmsConsent } from "@/lib/actions";
import { databaseReady, db } from "@/lib/db";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  if (!databaseReady()) return <p className="banner">Database key is missing.</p>;
  const { id } = await params;
  const person = await db.person(Number(id));
  if (!person) notFound();
  const [consent, members, circles] = await Promise.all([db.consentForPerson(person.id), db.members(), db.circles()]);
  const seat = members.find((member) => member.person_id === person.id && member.status === "active");
  const circle = seat ? circles.find((item) => item.id === seat.circle_id) : null;
  const sms = consent.find((event) => event.channel === "sms");
  const email = consent.find((event) => event.channel === "email");

  return (
    <>
      <p className="kicker">Person</p>
      <h1>{person.full_name}</h1>
      <p className="lede">
        {person.email}
        {person.phone ? ` · ${person.phone}` : ""}
        {circle ? ` · ${circle.location || `Circle ${circle.id}`}` : " · not in a circle"}
      </p>
      <div className="split">
        <article className="card">
          <h2>Consent</h2>
          <p className="meta" style={{ marginTop: 8 }}>
            Text: {sms?.event === "opt_in" ? `yes, recorded ${sms.occurred_at}` : "no record, texts will be skipped"}
          </p>
          <p className="meta">Email: {email?.event === "opt_out" ? `opted out ${email.occurred_at}` : "still allowed"}</p>
          {sms?.disclosure_text ? <p style={{ marginTop: 12 }}>{sms.disclosure_text}</p> : null}
        </article>
        <form className="card stack" action={recordSmsConsent}>
          <h2>Record text consent</h2>
          <p className="meta">Staff only. Paste the disclosure they actually saw, and the time is stored with it.</p>
          <input type="hidden" name="person_id" value={person.id} />
          <label>
            Disclosure text
            <textarea name="disclosure_text" required />
          </label>
          <button className="primary" type="submit">
            Save consent
          </button>
        </form>
      </div>
    </>
  );
}
