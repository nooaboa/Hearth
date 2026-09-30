"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, passwordMatches, sessionToken } from "./auth";
import { CONTACT_COLUMNS } from "./contacts";
import { db } from "./db";
import {
  agreementFile,
  agreementPath,
  isAgreementKind,
  matchesAgreementBytes,
  removeStoredFile,
  uploadStoredFile,
} from "./files";
import { runWorkflow } from "./n8n";
import { WINDOWS, localInputToUtc, parseUsDate, parseUsDateTimeLocal } from "./time";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function number(form: FormData, key: string) {
  const value = Number(text(form, key));
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${key} is missing.`);
  return value;
}

function phoneValue(raw: string) {
  const phone = raw.trim();
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) throw new Error("Enter a full phone number.");
  return phone;
}

function saveError(error: unknown) {
  const message = error instanceof Error ? error.message : "Could not save.";
  if (message.includes("people_email_uidx")) return "That email is already on another contact.";
  if (message.includes("people_phone_uidx")) return "That phone is already on another contact.";
  return message;
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
  const row = await db.insert<{ id: number }>("people", {
    full_name: text(form, "full_name"),
    email: text(form, "email").toLowerCase(),
    phone: phoneValue(text(form, "phone")),
  });
  redirect(`/people/${row.id}`);
}

export async function updatePerson(form: FormData) {
  const personId = number(form, "person_id");
  const fullName = text(form, "full_name");
  const email = text(form, "email").toLowerCase();
  if (!fullName) throw new Error("Name is required.");
  await db.updatePerson(personId, {
    full_name: fullName,
    email: email || null,
    phone: phoneValue(text(form, "phone")),
  });
  redirect(`/people/${personId}`);
}

export async function updateContactField(
  personId: number,
  field: string,
  value: string | string[] | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(personId) || personId <= 0) return { ok: false, error: "Missing contact." };
  const column = CONTACT_COLUMNS.find((item) => item.key === field);
  if (!column) return { ok: false, error: "That column can't be edited." };
  const payload: Record<string, string | string[] | null> = {};
  if (column.kind === "tags") {
    const tags = Array.isArray(value) ? value : [];
    payload[field] = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  } else if (column.kind === "date") {
    const raw = typeof value === "string" ? value.trim() : "";
    if (raw && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { ok: false, error: "Use a real date." };
    payload[field] = raw || null;
  } else if (field === "full_name") {
    const raw = typeof value === "string" ? value.trim() : "";
    if (!raw) return { ok: false, error: "Name is required." };
    payload.full_name = raw;
  } else if (field === "phone") {
    try {
      payload.phone = phoneValue(typeof value === "string" ? value : "");
    } catch (error) {
      return { ok: false, error: saveError(error) };
    }
  } else {
    const raw = typeof value === "string" ? value.trim() : "";
    payload[field] = raw || null;
  }
  try {
    await db.updatePerson(personId, payload);
  } catch (error) {
    return { ok: false, error: saveError(error) };
  }
  revalidatePath("/contacts");
  return { ok: true };
}

export async function createBlankContact(): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  try {
    const row = await db.insert<{ id: number }>("people", { full_name: "New contact", email: null });
    revalidatePath("/contacts");
    return { ok: true, id: row.id };
  } catch (error) {
    return { ok: false, error: saveError(error) };
  }
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
  const [weekdayText, windowKey = ""] = text(form, "window").split("|");
  const weekday = Number(weekdayText);
  const window = (WINDOWS[weekday] ?? []).find((item) => `${item.start}-${item.end}` === windowKey);
  if (!window) throw new Error("Pick one of the meeting windows.");
  const timezone = text(form, "timezone");
  if (!timezone) throw new Error("Timezone is required.");
  const kind = text(form, "kind");
  if (kind !== "new" && kind !== "existing") throw new Error("Circle kind is required.");
  const pattern = text(form, "pattern");
  if (pattern !== "week_1_3" && pattern !== "week_2_4") throw new Error("Pattern is required.");
  const seasonStart = parseUsDate(text(form, "season_start"));
  const seasonEnd = parseUsDate(text(form, "season_end"));
  if (!seasonStart || !seasonEnd) {
    throw new Error("Season dates must be real calendar dates in MM/DD/YYYY.");
  }
  if (seasonEnd <= seasonStart) {
    throw new Error("Season end has to be after the season start. A fall-to-winter season uses the next year for the end date.");
  }
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
    season_start: seasonStart,
    season_end: seasonEnd,
  };
}

export async function createCircle(form: FormData) {
  const body = circleBody(form);
  const row = await db.insert<{ id: number }>("circles", { ...body, status: "proposed" });
  await db.updateCircle(row.id, { ...body, status: "confirmed" });
  try {
    await db.insert("circle_members", {
      circle_id: row.id,
      person_id: body.host_id,
      status: "active",
    });
  } catch (error) {
    await db.remove("circles", row.id);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("circle_members_one_active_circle")) {
      throw new Error("That host is already active in another circle.");
    }
    throw error;
  }
  redirect(`/circles/${row.id}`);
}

export async function updateCircleDetails(form: FormData) {
  const circleId = number(form, "circle_id");
  const existing = await db.circle(circleId);
  if (!existing) throw new Error("Circle is missing.");
  const body = circleBody(form);
  await db.updateCircle(circleId, body);
  const members = await db.members(circleId);
  const seated = members.some((member) => member.person_id === body.host_id && member.status !== "dropped");
  if (!seated) {
    try {
      await db.insert("circle_members", {
        circle_id: circleId,
        person_id: body.host_id,
        status: "active",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("circle_members_one_active_circle")) {
        throw new Error("Circle saved. That host is already active in another circle, so they were not added to the roster.");
      }
      throw error;
    }
  }
  redirect(`/circles/${circleId}`);
}

export async function deleteCircle(form: FormData) {
  const circleId = number(form, "circle_id");
  await db.removeWhere("sends", `circle_id=eq.${circleId}`);
  await db.removeWhere("feedback_responses", `circle_id=eq.${circleId}`);
  await db.remove("circles", circleId);
  redirect("/circles");
}

export async function deletePerson(form: FormData) {
  const personId = number(form, "person_id");
  await db.clearRole("facilitator_id", personId);
  await db.clearRole("host_id", personId);
  await db.removeWhere("attendance_marks", `person_id=eq.${personId}`);
  await db.removeWhere("attendance_reports", `facilitator_id=eq.${personId}`);
  await db.removeWhere("sends", `person_id=eq.${personId}`);
  await db.removeWhere("rsvps", `person_id=eq.${personId}`);
  await db.removeWhere("consent_events", `person_id=eq.${personId}`);
  await db.removeWhere("feedback_responses", `person_id=eq.${personId}`);
  await db.removeWhere("contributions", `person_id=eq.${personId}`);
  await db.removeWhere("circle_members", `person_id=eq.${personId}`);
  const files = await db.filesForPerson(personId);
  for (const file of files) await removeStoredFile(file.storage_path);
  await db.remove("people", personId);
  redirect("/people");
}

export async function uploadMemberFile(form: FormData) {
  const personId = number(form, "person_id");
  const kind = text(form, "kind");
  if (!isAgreementKind(kind)) throw new Error("Pick a membership agreement or a leadership role agreement.");
  const signedText = text(form, "signed_on");
  const signedOn = signedText ? parseUsDate(signedText) : null;
  if (signedText && !signedOn) throw new Error("Signed date must be MM/DD/YYYY.");
  const { file, contentType, fileName } = agreementFile(form.get("file"));
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesAgreementBytes(bytes, contentType)) {
    throw new Error("That file does not match a PDF or photo. Upload the signed agreement again.");
  }
  const person = await db.person(personId);
  if (!person) throw new Error("Person is missing.");
  const storagePath = agreementPath(personId, kind, contentType);
  await uploadStoredFile(storagePath, bytes, contentType);
  try {
    await db.insert("member_files", {
      person_id: personId,
      kind,
      file_name: fileName,
      storage_path: storagePath,
      content_type: contentType,
      byte_size: bytes.byteLength,
      signed_on: signedOn,
    });
  } catch (error) {
    await removeStoredFile(storagePath);
    throw error;
  }
  redirect(`/people/${personId}`);
}

export async function deleteMemberFile(form: FormData) {
  const personId = number(form, "person_id");
  const file = await db.memberFile(personId, number(form, "file_id"));
  if (!file) throw new Error("That agreement is already gone.");
  await removeStoredFile(file.storage_path);
  await db.remove("member_files", file.id);
  redirect(`/people/${personId}`);
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
  const starts = parseUsDateTimeLocal(text(form, "starts_at"));
  const ends = parseUsDateTimeLocal(text(form, "ends_at"));
  if (!starts || !ends) throw new Error("Meeting times must look like 10/07/2026, 7:00 PM.");
  await runWorkflow("hearth-move-meeting", {
    meeting_id: meetingId,
    starts_at: localInputToUtc(starts, zone),
    ends_at: localInputToUtc(ends, zone),
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
