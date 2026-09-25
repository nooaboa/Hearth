import Link from "next/link";
import { databaseReady, db } from "@/lib/db";
import { patternLabel, weekdayLabel } from "@/lib/time";

export default async function CirclesPage() {
  if (!databaseReady()) return <p className="banner">Database key is missing.</p>;
  const circles = await db.circles();
  return (
    <>
      <div className="row">
        <div>
          <p className="kicker">Circles</p>
          <h1>The season.</h1>
        </div>
        <Link className="primary" href="/circles/new">
          New circle
        </Link>
      </div>
      <div className="cards" style={{ marginTop: 24 }}>
        {circles.length === 0 ? <article className="card">No circles yet.</article> : null}
        {circles.map((circle) => (
          <article className="card" key={circle.id}>
            <div className="row">
              <div>
                <h2>
                  <Link href={`/circles/${circle.id}`}>{circle.location || `Circle ${circle.id}`}</Link>
                </h2>
                <p className="meta">
                  {circle.kind} · {circle.status} · {weekdayLabel(circle.weekday)} · {patternLabel(circle.pattern)}
                </p>
              </div>
              <span className="pill iris">{circle.timezone || "Timezone missing"}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
