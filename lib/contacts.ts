export type Contact = {
  id: number;
  full_name: string;
  fall_2026: string | null;
  relationship: string[];
  circle_label: string | null;
  email: string | null;
  phone: string | null;
  payment: string[];
  lead_status: string[];
  availability: string[];
  acceptable_locations: string[];
  zip_code: string | null;
  neighborhood: string | null;
  source: string | null;
  clarify_source: string | null;
  living_room_for_8: string | null;
  down_to_host: string | null;
  hosting_notes: string | null;
  facilitator_interest: string | null;
  topics_of_interest: string[];
  pronouns: string | null;
  preferred_name: string | null;
  notes: string | null;
  notable_skills: string | null;
  home_address: string | null;
  spiritual_background: string | null;
  birthdate: string | null;
  t_shirt: string | null;
  donation_status: string | null;
  exit_reasons: string[];
  last_contacted: string | null;
};

export type ColumnKind = "text" | "longtext" | "tags" | "select" | "date";

export type ContactColumn = {
  key: keyof Contact;
  label: string;
  kind: ColumnKind;
  width: number;
};

export const CONTACT_COLUMNS: ContactColumn[] = [
  { key: "full_name", label: "Name", kind: "text", width: 220 },
  { key: "fall_2026", label: "2026", kind: "select", width: 150 },
  { key: "relationship", label: "Relationship", kind: "tags", width: 340 },
  { key: "circle_label", label: "Circle", kind: "select", width: 170 },
  { key: "email", label: "Email", kind: "text", width: 240 },
  { key: "phone", label: "Phone", kind: "text", width: 160 },
  { key: "payment", label: "Payment", kind: "tags", width: 200 },
  { key: "lead_status", label: "Lead Status", kind: "tags", width: 280 },
  { key: "availability", label: "Availability", kind: "tags", width: 300 },
  { key: "acceptable_locations", label: "Acceptable Locations", kind: "tags", width: 280 },
  { key: "zip_code", label: "Zip Code", kind: "text", width: 110 },
  { key: "neighborhood", label: "Neighborhood", kind: "text", width: 240 },
  { key: "source", label: "Source", kind: "select", width: 150 },
  { key: "clarify_source", label: "Clarify Source", kind: "longtext", width: 260 },
  { key: "living_room_for_8", label: "Has living room for 8?", kind: "select", width: 200 },
  { key: "down_to_host", label: "Down to host", kind: "select", width: 140 },
  { key: "hosting_notes", label: "Notes re: hosting", kind: "longtext", width: 280 },
  { key: "facilitator_interest", label: "Facilitator interest?", kind: "select", width: 190 },
  { key: "topics_of_interest", label: "Topics of interest", kind: "tags", width: 320 },
  { key: "pronouns", label: "Pronouns", kind: "text", width: 130 },
  { key: "preferred_name", label: "Preferred Name", kind: "text", width: 160 },
  { key: "notes", label: "Notes", kind: "longtext", width: 300 },
  { key: "notable_skills", label: "Notable skills?", kind: "longtext", width: 240 },
  { key: "home_address", label: "Home Address", kind: "longtext", width: 260 },
  { key: "spiritual_background", label: "Religious/Spiritual background", kind: "longtext", width: 280 },
  { key: "birthdate", label: "Birthdate", kind: "date", width: 140 },
  { key: "t_shirt", label: "T-Shirt", kind: "select", width: 100 },
  { key: "donation_status", label: "Donation Status", kind: "text", width: 160 },
  { key: "exit_reasons", label: "Exit Reasons", kind: "tags", width: 200 },
  { key: "last_contacted", label: "Last Contacted", kind: "date", width: 150 },
];

export const CONTACT_SELECT = ["id", ...CONTACT_COLUMNS.map((column) => column.key)].join(",");

const NAMED_TONES: Record<string, string> = {
  Lead: "blue",
  Vetted: "gold",
  "Non-NYC": "iris",
  DTR: "blush",
  Soon: "lilac",
  "Trial Period": "slate",
  "Former Lead": "ember",
  "Former Member": "ember",
  "Supporter - Monthly Updates": "blush",
  "Supporter - 6mo updates": "pink",
  "Potential Donor": "green",
  "Member - In Circle": "green",
  "Member - Deposit Paid": "green",
  "Park Slope": "lilac",
  "Lower Manhattan": "blush",
  "Upper Manhattan": "iris",
  Williamsburg: "blue",
  "Union Square": "gold",
  "Bed-Stuy": "green",
  Yes: "green",
  No: "ember",
  Maybe: "gold",
  "Maybe / tell me more": "lilac",
  "Not right now": "slate",
  Recurring: "green",
  "One-time": "blue",
  Dropped: "ember",
  "$1 pause": "gold",
  "Host trade-in": "lilac",
  confirmed: "green",
  hold: "ember",
  "not till 2027": "slate",
  "texted 8.5": "blue",
  "texted 8.5 (confirmed interested)": "green",
  Friend: "blue",
  Newsletter: "blush",
  Meetup: "gold",
  Google: "slate",
  Online: "iris",
  Unknown: "slate",
  "Don't remember": "slate",
};

const PALETTE = ["blue", "gold", "iris", "blush", "lilac", "slate", "ember", "green", "pink"];

export function tagTone(value: string) {
  if (NAMED_TONES[value]) return NAMED_TONES[value];
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function showDate(iso: string | null) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
