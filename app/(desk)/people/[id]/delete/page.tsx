import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePerson } from "@/lib/actions";
import { databaseReady, db } from "@/lib/db";

export default async function DeletePersonPage({ params }: { params: Promise<{ id: string }> }) {
  if (!databaseReady()) return <p className="banner">Database key is missing.</p>;
  const { id } = await params;
  const person = await db.person(Number(id));
  if (!person) notFound();

  return (
    <>
      <Link className="back" href={`/people/${person.id}`}>
        ← {person.full_name}
      </Link>
      <p className="kicker">Delete member</p>
      <h1>{person.full_name}</h1>
      <p className="lede">
        This removes {person.full_name} from every circle and deletes their records. This cannot be undone.
      </p>
      <form className="row" action={deletePerson} style={{ justifyContent: "flex-start", alignItems: "center" }}>
        <input type="hidden" name="person_id" value={person.id} />
        <button className="primary" type="submit">
          Delete member
        </button>
        <Link className="outline" href={`/people/${person.id}`}>
          Cancel
        </Link>
      </form>
    </>
  );
}
