"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, passwordMatches, sessionToken } from "./auth";
import { db } from "./db";
import { runWorkflow } from "./n8n";
import { WINDOWS, localInputToUtc } from "./time";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function number(form: FormData, key: string) {
  const value = Number(text(form, key));
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${key} is missing.`);
  return value;
}

export async function login(form: FormData) {
  if (!passwordMatches(text(form, "password"))) {
    redirect("/login?error=1");
  }
  const jar = await cookies();
  jar.set(COOKIE, sessionToken(), { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
  redirect("/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE);
  redirect("/login");
}

export async function createPerson(form: FormData) {
  const phone = text(form, "phone");
  if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new Error("Phone must be E.164, like +12125550100.");
  }
  const row = await db.insert<{ id: number }>("people", {
    full_name: text(form, "full_name"),
    email: text(form, "email").toLowerCase(),
    phone: phone || null,
  });
  redirect(`/people/${row.id}`);
}

export async function recordSmsConsent(form: FormData) {
  const personId = number(form, "person_id");
  const disclosure = text(form, "disclosure_text");
  if (!disclosure) throw new Error("Disclosure text is required before a person can be texted.");
  await db.insert("consent_events", {
    person_id: personId,
    channel: "sms",
    event: "opt_in",
    source: "operator",
    disclosure_text: disclosure,
  });
  redirect(`/people/${personId}`);
}

function circleBody(form: FormData) {
  const weekday = number(form, "weekday");
  const windowKey = text(form, "window");
  const window = (WINDOWS[weekday] ?? []).find((item) => `${item.start}-${item.end}` === windowKey);
  if (!window) throw new Error("Pick one of the meeting windows.");
  const timezone = text(form, "timezone");
  if (!timezone) throw new Error("Timezone is required.");
  const kind = text(form, "kind");
  if (kind !== "new" && kind !== "existing") throw new Error("Circle kind is required.");
  const pattern = text(form, "pattern");
  if (pattern !== "week_1_3" && pattern !== "week_2_4") throw new Error("Pattern is required.");
  return {
    kind,
    pattern,
    weekday,
    local_start: window.start,
    local_end: window.end,
    timezone,
    location: text(form, "location"),
    facilitator_id: number(form, "facilitator_id"),
    host_id: number(form, "host_id"),
    season_start: text(form, "season_start"),
    season_end: text(form, "season_end"),
  };
}

export async function createCircle(form: FormData) {
  const body = circleBody(form);
  const row = await db.insert<{ id: number }>("circles", { ...body, status: "proposed" });
  await db.updateCircle(row.id, { ...body, status: "confirmed" });
  redirect(`/circles/${row.id}`);
}

export async function addMember(form: FormData) {
  const circleId = number(form, "circle_id");
  await db.insert("circle_members", {
    circle_id: circleId,
    person_id: number(form, "person_id"),
    status: "active",
  });
  redirect(`/circles/${circleId}`);
}

export async function dropMember(form: FormData) {
  const circleId = number(form, "circle_id");
  const reason = text(form, "drop_reason");
  if (!["leave_request", "unpaid", "manual"].includes(reason)) throw new Error("Pick a drop reason.");
  await runWorkflow("hearth-drop-member", {
    person_id: number(form, "person_id"),
    circle_id: circleId,
    drop_reason: reason,
  });
  redirect(`/circles/${circleId}?sent=drop`);
}

export async function launchCircle(form: FormData) {
  const circleId = number(form, "circle_id");
  const kind = text(form, "kind");
  const path = kind === "existing" ? "hearth-season-invites" : "hearth-launch-circle";
  await runWorkflow(path, { circle_id: circleId });
  redirect(`/circles/${circleId}?sent=launch`);
}

export async function moveMeeting(form: FormData) {
  const meetingId = number(form, "meeting_id");
  const zone = text(form, "timezone");
  const location = text(form, "location");
  await runWorkflow("hearth-move-meeting", {
    meeting_id: meetingId,
    starts_at: localInputToUtc(text(form, "starts_at"), zone),
    ends_at: localInputToUtc(text(form, "ends_at"), zone),
    location,
  });
  redirect(`/meetings/${meetingId}?sent=move`);
}

export async function saveAttendance(form: FormData) {
  const meetingId = number(form, "meeting_id");
  const marks = form
    .getAll("person_id")
    .map((value) => Number(value))
    .filter((id) => Number.isInteger(id))
    .map((personId) => ({ person_id: personId, present: form.get(`present_${personId}`) === "on" }));
  await runWorkflow("hearth-attendance", {
    meeting_id: meetingId,
    facilitator_id: number(form, "facilitator_id"),
    notes: text(form, "notes"),
    marks,
  });
  redirect(`/meetings/${meetingId}?sent=attendance`);
}
