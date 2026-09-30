import Link from "next/link";
import { notFound } from "next/navigation";
import { AttendanceTable } from "../../attendance/table";
import { deleteMemberFile, recordSmsConsent, updatePerson, uploadMemberFile } from "@/lib/actions";
import { loadAttendance } from "@/lib/attendance";
import { databaseReady, db } from "@/lib/db";
import { AGREEMENT_KINDS, agreementLabel } from "@/lib/files";
import { formatWhen, monthDayYear } from "@/lib/time";

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
  const [consent, members, circles, attendance, files] = await Promise.all([
    db.consentForPerson(person.id),
    db.members(),
    db.circles(),
    loadAttendance(person.id),
    db.filesForPerson(person.id),
  ]);
  const seat = members.find((member) => member.person_id === person.id && member.status === "active");
  const circle = seat ? circles.find((item) => item.id === seat.circle_id) : null;
  const sms = consent.find((event) => event.channel === "sms");
  const email = consent.find((event) => event.channel === "email");
  const zone = circle?.timezone || "America/New_York";

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
        {person.email || "No email on file"}
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
                <input name="email" type="email" defaultValue={person.email ?? ""} />
              </label>
              <label>
                Phone
                <input name="phone" placeholder="(212) 555-0100" defaultValue={person.phone ?? ""} />
              </label>
              <button className="primary" type="submit">
                Save person
              </button>
            </form>
          ) : null}
          <article className="card">
            <h2>Consent</h2>
            <p className="meta" style={{ marginTop: 8 }}>
              Text: {sms?.event === "opt_in" ? `yes, recorded ${formatWhen(sms.occurred_at, zone)}` : "no record, texts will be skipped"}
            </p>
            <p className="meta">Email: {email?.event === "opt_out" ? `opted out ${formatWhen(email.occurred_at, zone)}` : "still allowed"}</p>
            {sms?.disclosure_text ? <p style={{ marginTop: 12 }}>{sms.disclosure_text}</p> : null}
          </article>
          <section className="card stack">
            <h2>Signed agreements</h2>
            <p className="meta">
              Membership agreements, and leadership role agreements for facilitators and hosts. Only the desk can open these files.
            </p>
            {files.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Agreement</th>
                    <th>Signed</th>
                    <th>File</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id}>
                      <td>{agreementLabel(file.kind)}</td>
                      <td>{file.signed_on ? monthDayYear(file.signed_on) : "—"}</td>
                      <td>
                        <div>{file.file_name}</div>
                        <div className="meta">Uploaded {formatWhen(file.uploaded_at, zone)}</div>
                        <div className="row" style={{ justifyContent: "flex-start", alignItems: "center", gap: 10, marginTop: 8 }}>
                          <a href={`/people/${person.id}/files/${file.id}`}>Download</a>
                          <form action={deleteMemberFile}>
                            <input type="hidden" name="person_id" value={person.id} />
                            <input type="hidden" name="file_id" value={file.id} />
                            <button className="ghost" type="submit" style={{ padding: "6px 12px" }}>
                              Remove
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="meta">None on file yet.</p>
            )}
            <form className="stack" action={uploadMemberFile}>
              <input type="hidden" name="person_id" value={person.id} />
              <label>
                Agreement
                <select name="kind" required defaultValue="membership_agreement">
                  {AGREEMENT_KINDS.map((kind) => (
                    <option key={kind.value} value={kind.value}>
                      {kind.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Signed on
                <input name="signed_on" inputMode="numeric" autoComplete="off" placeholder="MM/DD/YYYY" />
              </label>
              <label>
                File
                <input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" />
                <span className="meta">PDF or a photo, up to 10 MB.</span>
              </label>
              <button className="primary" type="submit">
                Upload agreement
              </button>
            </form>
          </section>
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
      <article style={{ marginTop: 16 }}>
        <div className="row" style={{ marginBottom: 12 }}>
          <div>
            <h2>Attendance</h2>
            <p className="meta" style={{ marginTop: 6 }}>
              {attendance.length === 0
                ? "No nights recorded yet."
                : `${attendance.filter((row) => row.present).length} of ${attendance.length} recorded nights, here.`}
            </p>
          </div>
          {attendance.length ? (
            <Link className="outline" href={`/attendance?person=${person.id}`}>
              Check this person
            </Link>
          ) : null}
        </div>
        {attendance.length ? <AttendanceTable rows={attendance} showPerson={false} /> : null}
      </article>
    </>
  );
}
