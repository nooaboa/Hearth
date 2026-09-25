import Link from "next/link";
import { createPerson } from "@/lib/actions";
import { databaseReady, db } from "@/lib/db";

export default async function PeoplePage() {
  if (!databaseReady()) return <p className="banner">Database key is missing.</p>;
  const [people, members, circles, sms, emailOut] = await Promise.all([
    db.people(),
    db.members(),
    db.circles(),
    db.smsOptIns(),
    db.emailOptOuts(),
  ]);
  const circleById = new Map(circles.map((circle) => [circle.id, circle]));
  const textable = new Set(sms.map((row) => row.person_id));
  const optedOut = new Set(emailOut.map((row) => row.person_id));

  return (
    <>
      <p className="kicker">People</p>
      <h1>The room, named.</h1>
      <div className="split" style={{ marginTop: 24 }}>
        <div className="card" style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Circle</th>
                <th>Text</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => {
                const seat = members.find((member) => member.person_id === person.id && member.status === "active");
                return (
                  <tr key={person.id}>
                    <td>
                      <Link href={`/people/${person.id}`}>{person.full_name}</Link>
                      <div className="meta">{person.email}</div>
                    </td>
                    <td>{seat ? circleById.get(seat.circle_id)?.location || `Circle ${seat.circle_id}` : "—"}</td>
                    <td>{textable.has(person.id) ? "Consent on file" : "No consent"}</td>
                    <td>{optedOut.has(person.id) ? "Opted out" : "Ok"}</td>
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
            <input name="phone" placeholder="+12125550100" />
          </label>
          <button className="primary" type="submit">
            Save person
          </button>
        </form>
      </div>
    </>
  );
}
