import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCircle } from "@/lib/actions";
import { databaseReady, db } from "@/lib/db";

export default async function DeleteCirclePage({ params }: { params: Promise<{ id: string }> }) {
  if (!databaseReady()) return <p className="banner">Database key is missing.</p>;
  const { id } = await params;
  const circle = await db.circle(Number(id));
  if (!circle) notFound();
  const name = circle.location || `Circle ${circle.id}`;

  return (
    <>
      <Link className="back" href={`/circles/${circle.id}`}>
        ← {name}
      </Link>
      <p className="kicker">Delete circle</p>
      <h1>{name}</h1>
      <p className="lede">
        This removes the circle, its roster, and its meetings. The people stay. This cannot be undone.
      </p>
      <form className="row" action={deleteCircle} style={{ justifyContent: "flex-start", alignItems: "center" }}>
        <input type="hidden" name="circle_id" value={circle.id} />
        <button className="primary" type="submit">
          Delete circle
        </button>
        <Link className="outline" href={`/circles/${circle.id}`}>
          Cancel
        </Link>
      </form>
    </>
  );
}
