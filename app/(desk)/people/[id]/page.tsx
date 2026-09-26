import Link from "next/link";
import { notFound } from "next/navigation";
import { recordSmsConsent, updatePerson } from "@/lib/actions";
import { databaseReady, db } from "@/lib/db";

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  if (!databaseReady()) return <p className="banner">Database key is missing.</p>;
  const { id } = await params;
  const query = await searchParams;
  const person = await db.person(Number(id));
  if (!person) notFound();
  const [consent, members, circles] = await Promise.all([db.consentForPerson(person.id), db.members(), db.circles()]);
  const seat = members.find((member) => member.person_id === person.id && member.status === "active");
  const circle = seat ? circles.find((item) => item.id === seat.circle_id) : null;
  const sms = consent.find((event) => event.channel === "sms");
  const email = consent.find((event) => event.channel === "email");

  return (
    <>
      <Link className="back" href="/people">
        ← People
      </Link>
      <p className="kicker">Person</p>
      <div className="title">
        <h1>{person.full_name}</h1>
        <Link className="icon" href={query.edit ? `/people/${person.id}` : `/people/${person.id}?edit=1`} aria-label="Edit person">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </Link>
        <Link className="icon" href={`/people/${person.id}/delete`} aria-label="Delete member">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </Link>
      </div>
      <p className="lede">
        {person.email}
        {person.phone ? ` · ${person.phone}` : ""}
        {circle ? ` · ${circle.location || `Circle ${circle.id}`}` : " · not in a circle"}
      </p>
      <div className="split">
        <div className="cards">
          {query.edit ? (
            <form className="card stack" action={updatePerson}>
              <h2>Details</h2>
              <input type="hidden" name="person_id" value={person.id} />
              <label>
                Name
                <input name="full_name" required defaultValue={person.full_name} />
              </label>
              <label>
                Email
                <input name="email" type="email" required defaultValue={person.email} />
              </label>
              <label>
                Phone
                <input name="phone" placeholder="+12125550100" defaultValue={person.phone ?? ""} />
              </label>
              <button className="primary" type="submit">
                Save person
              </button>
            </form>
          ) : null}
          <article className="card">
            <h2>Consent</h2>
            <p className="meta" style={{ marginTop: 8 }}>
              Text: {sms?.event === "opt_in" ? `yes, recorded ${sms.occurred_at}` : "no record, texts will be skipped"}
            </p>
            <p className="meta">Email: {email?.event === "opt_out" ? `opted out ${email.occurred_at}` : "still allowed"}</p>
            {sms?.disclosure_text ? <p style={{ marginTop: 12 }}>{sms.disclosure_text}</p> : null}
          </article>
        </div>
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
