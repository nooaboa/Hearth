import { CircleForm } from "../form";
import { createCircle } from "@/lib/actions";
import { databaseReady, db } from "@/lib/db";

export default async function NewCirclePage() {
  if (!databaseReady()) return <p className="banner">Database key is missing.</p>;
  const people = await db.people();
  return (
    <>
      <p className="kicker">New circle</p>
      <h1>Set the table.</h1>
      <p className="lede">Saving confirms the schedule. Launching it, from the circle page, is what asks n8n to build the calendar.</p>
      <CircleForm action={createCircle} people={people} submitLabel="Confirm circle" />
    </>
  );
}
