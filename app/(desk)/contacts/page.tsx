import { ContactGrid } from "./grid";
import { CONTACT_COLUMNS, type Contact } from "@/lib/contacts";
import { databaseReady, db } from "@/lib/db";

function withLists(contact: Contact): Contact {
  const next = { ...contact };
  for (const column of CONTACT_COLUMNS) {
    if (column.kind === "tags" && !Array.isArray(next[column.key])) {
      (next[column.key] as string[]) = [];
    }
  }
  return next;
}

export default async function ContactsPage() {
  if (!databaseReady()) return <p className="banner">Database key is missing.</p>;
  const contacts = (await db.contacts()).map(withLists);
  const options: Record<string, string[]> = {};
  for (const column of CONTACT_COLUMNS) {
    if (column.kind !== "tags" && column.kind !== "select") continue;
    const values = new Set<string>();
    for (const contact of contacts) {
      const value = contact[column.key];
      if (Array.isArray(value)) value.forEach((tag) => tag && values.add(tag));
      else if (typeof value === "string" && value) values.add(value);
    }
    options[column.key] = [...values].sort((a, b) => a.localeCompare(b));
  }
  return <ContactGrid contacts={contacts} options={options} />;
}
