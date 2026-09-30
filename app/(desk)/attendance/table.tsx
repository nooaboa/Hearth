import Link from "next/link";
import type { AttendanceRow } from "@/lib/attendance";
import { formatWhen } from "@/lib/time";

export function AttendanceTable({ rows, showPerson = true }: { rows: AttendanceRow[]; showPerson?: boolean }) {
  return (
    <div className="card" style={{ overflowX: "auto" }}>
      <table>
        <thead>
          <tr>
            {showPerson ? <th>Person</th> : null}
            <th>Meeting</th>
            <th>When</th>
            <th>Circle</th>
            <th>There</th>
            <th>Reply</th>
            <th>Lineup</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.markId}>
              {showPerson ? (
                <td>
                  <Link href={`/people/${row.personId}`}>{row.personName}</Link>
                </td>
              ) : null}
              <td>
                <Link href={`/meetings/${row.meetingId}`}>{row.meetingTitle}</Link>
              </td>
              <td>{formatWhen(row.startsAt, row.timezone)}</td>
              <td>
                <Link href={`/circles/${row.circleId}`}>{row.circleLabel}</Link>
              </td>
              <td>
                <span className={row.present ? "pill yes" : "pill no"}>{row.present ? "Here" : "Away"}</span>
              </td>
              <td>{row.rsvp === "yes" ? "In" : row.rsvp === "no" ? "Out" : "No reply"}</td>
              <td>{row.relationLabel}</td>
              <td>{row.notes || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
