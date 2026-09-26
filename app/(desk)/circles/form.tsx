import type { Circle, Person } from "@/lib/db";
import { TIMEZONES, WEEKDAYS, WINDOWS } from "@/lib/time";

function clockValue(value: string | null) {
  return value ? value.slice(0, 5) : "";
}

export function CircleForm({
  action,
  people,
  circle,
  submitLabel,
}: {
  action: (form: FormData) => void | Promise<void>;
  people: Person[];
  circle?: Circle | null;
  submitLabel: string;
}) {
  const windowValue =
    circle?.weekday && circle.local_start && circle.local_end
      ? `${circle.weekday}|${clockValue(circle.local_start)}-${clockValue(circle.local_end)}`
      : "";
  return (
    <form className="card stack" action={action} style={{ maxWidth: 640 }}>
      {circle ? <input type="hidden" name="circle_id" value={circle.id} /> : null}
      <label>
        Kind
        <select name="kind" required defaultValue={circle?.kind ?? ""}>
          <option value="" disabled>
            Choose
          </option>
          <option value="new">New circle</option>
          <option value="existing">Existing circle</option>
        </select>
      </label>
      <label>
        Pattern
        <select name="pattern" required defaultValue={circle?.pattern ?? ""}>
          <option value="" disabled>
            Choose
          </option>
          <option value="week_1_3">1st and 3rd</option>
          <option value="week_2_4">2nd and 4th</option>
        </select>
      </label>
      <label>
        Window
        <select name="window" required defaultValue={windowValue}>
          <option value="" disabled>
            Choose
          </option>
          {Object.entries(WINDOWS).flatMap(([weekday, windows]) =>
            windows.map((window) => (
              <option key={`${weekday}-${window.start}`} value={`${weekday}|${window.start}-${window.end}`}>
                {WEEKDAYS.find((day) => day.value === Number(weekday))?.label}: {window.label}
              </option>
            )),
          )}
        </select>
      </label>
      <label>
        Timezone
        <select name="timezone" required defaultValue={circle?.timezone ?? ""}>
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
        <input name="location" required defaultValue={circle?.location ?? ""} />
      </label>
      <label>
        Season starts
        <input name="season_start" type="date" required defaultValue={circle?.season_start?.slice(0, 10) ?? ""} />
      </label>
      <label>
        Season ends
        <input name="season_end" type="date" required defaultValue={circle?.season_end?.slice(0, 10) ?? ""} />
        <span className="meta">End date has to be after the start. A season that runs into winter uses the next year.</span>
      </label>
      <label>
        Facilitator
        <select name="facilitator_id" required defaultValue={circle?.facilitator_id ?? ""}>
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
        <select name="host_id" required defaultValue={circle?.host_id ?? ""}>
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
        {submitLabel}
      </button>
    </form>
  );
}
