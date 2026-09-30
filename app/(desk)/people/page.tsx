import Link from "next/link";
import { createPerson } from "@/lib/actions";
import { databaseReady, db } from "@/lib/db";

export default async function PeoplePage() {
  if (!databaseReady()) return <p className="banner">Database key is missing.</p>;
  const [people, members, circles, sms, emailOut, marks, files] = await Promise.all([
    db.people(),
    db.members(),
    db.circles(),
    db.smsOptIns(),
    db.emailOptOuts(),
    db.attendanceMarks(),
    db.memberFiles(),
  ]);
  const circleById = new Map(circles.map((circle) => [circle.id, circle]));
  const textable = new Set(sms.map((row) => row.person_id));
  const optedOut = new Set(emailOut.map((row) => row.person_id));
  const agreements = new Set(files.map((file) => `${file.person_id}:${file.kind}`));
  const attendance = new Map<number, { here: number; total: number }>();
  for (const mark of marks) {
    const tally = attendance.get(mark.person_id) ?? { here: 0, total: 0 };
    tally.total += 1;
    if (mark.present === true) tally.here += 1;
    attendance.set(mark.person_id, tally);
  }

  return (
    <>
      <p className="kicker">People</p>
      <h1>Member overview</h1>
      <div className="split" style={{ marginTop: 24 }}>
        <div className="card" style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Circle</th>
                <th>Attendance</th>
                <th>Text</th>
                <th>Email</th>
                <th>Agreements</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => {
                const seat = members.find((member) => member.person_id === person.id && member.status === "active");
                const tally = attendance.get(person.id);
                return (
                  <tr key={person.id}>
                    <td>
                      <Link href={`/people/${person.id}`}>{person.full_name}</Link>
                      <div className="meta">{person.email || "No email"}</div>
                    </td>
                    <td>{seat ? circleById.get(seat.circle_id)?.location || `Circle ${seat.circle_id}` : "—"}</td>
                    <td>
                      {tally ? (
                        <Link href={`/attendance?person=${person.id}`}>
                          {tally.here} of {tally.total} here
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{textable.has(person.id) ? "Consent on file" : "No consent"}</td>
                    <td>{optedOut.has(person.id) ? "Opted out" : "Ok"}</td>
                    <td>
                      {agreements.has(`${person.id}:membership_agreement`) || agreements.has(`${person.id}:leadership_agreement`) ? (
                        <div className="pills">
                          {agreements.has(`${person.id}:membership_agreement`) ? <span className="pill">Membership</span> : null}
                          {agreements.has(`${person.id}:leadership_agreement`) ? <span className="pill iris">Leadership</span> : null}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <form className="card stack" action={createPerson}>
          <h2>Add a person</h2>
          <label>
            Name
            <input name="full_name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Phone
            <input name="phone" placeholder="(212) 555-0100" />
          </label>
          <button className="primary" type="submit">
            Save person
          </button>
        </form>
      </div>
    </>
  );
}
