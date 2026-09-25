import { createCircle } from "@/lib/actions";
import { databaseReady, db } from "@/lib/db";
import { TIMEZONES, WEEKDAYS, WINDOWS } from "@/lib/time";

export default async function NewCirclePage() {
  if (!databaseReady()) return <p className="banner">Database key is missing.</p>;
  const people = await db.people();
  return (
    <>
      <p className="kicker">New circle</p>
      <h1>Set the table.</h1>
      <p className="lede">Saving confirms the schedule. Launching it, from the circle page, is what asks n8n to build the calendar.</p>
      <form className="card stack" action={createCircle} style={{ maxWidth: 640 }}>
        <label>
          Kind
          <select name="kind" required defaultValue="">
            <option value="" disabled>
              Choose
            </option>
            <option value="new">New circle</option>
            <option value="existing">Existing circle</option>
          </select>
        </label>
        <label>
          Pattern
          <select name="pattern" required defaultValue="">
            <option value="" disabled>
              Choose
            </option>
            <option value="week_1_3">1st and 3rd</option>
            <option value="week_2_4">2nd and 4th</option>
          </select>
        </label>
        <label>
          Weekday
          <select name="weekday" required defaultValue="">
            <option value="" disabled>
              Choose
            </option>
            {WEEKDAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Window
          <select name="window" required defaultValue="">
            <option value="" disabled>
              Choose
            </option>
            {Object.entries(WINDOWS).flatMap(([weekday, windows]) =>
              windows.map((window) => (
                <option key={`${weekday}-${window.start}`} value={`${window.start}-${window.end}`}>
                  {WEEKDAYS.find((day) => day.value === Number(weekday))?.label}: {window.label}
                </option>
              )),
            )}
          </select>
        </label>
        <label>
          Timezone
          <select name="timezone" required defaultValue="">
            <option value="" disabled>
              Choose a timezone
            </option>
            {TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </label>
        <label>
          Place
          <input name="location" required />
        </label>
        <label>
          Season starts
          <input name="season_start" type="date" required />
        </label>
        <label>
          Season ends
          <input name="season_end" type="date" required />
        </label>
        <label>
          Facilitator
          <select name="facilitator_id" required defaultValue="">
            <option value="" disabled>
              Choose
            </option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.full_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Host
          <select name="host_id" required defaultValue="">
            <option value="" disabled>
              Choose
            </option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.full_name}
              </option>
            ))}
          </select>
        </label>
        <button className="primary" type="submit">
          Confirm circle
        </button>
      </form>
    </>
  );
}
