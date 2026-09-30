"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createBlankContact, updateContactField } from "@/lib/actions";
import { CONTACT_COLUMNS, showDate, tagTone, type ColumnKind, type Contact, type ContactColumn } from "@/lib/contacts";

type EditState = { id: number; key: keyof Contact; rect: DOMRect };

export function ContactGrid({ contacts, options }: { contacts: Contact[]; options: Record<string, string[]> }) {
  const router = useRouter();
  const [rows, setRows] = useState(contacts);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: keyof Contact; dir: "asc" | "desc" }>({ key: "full_name", dir: "asc" });
  const [editing, setEditing] = useState<EditState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    if (!editing) setRows(contacts);
  }, [contacts, editing]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((row) => CONTACT_COLUMNS.some((column) => haystack(row[column.key]).toLowerCase().includes(needle)))
      : rows;
    return [...filtered].sort((a, b) => compareRows(a, b, sort.key, sort.dir));
  }, [rows, query, sort]);

  const editingRow = editing ? rows.find((row) => row.id === editing.id) : undefined;
  const editingColumn = editing ? CONTACT_COLUMNS.find((column) => column.key === editing.key) : undefined;

  function openEditor(event: React.MouseEvent<HTMLTableCellElement>, row: Contact, column: ContactColumn) {
    setEditing({ id: row.id, key: column.key, rect: event.currentTarget.getBoundingClientRect() });
    setError(null);
  }

  async function commit(row: Contact, column: ContactColumn, value: string | string[] | null) {
    const token = `${row.id}:${column.key}`;
    const next = cleanValue(value, column.kind);
    if (sameValue(row[column.key], next)) {
      setEditing((current) => (current && `${current.id}:${current.key}` === token ? null : current));
      return;
    }
    setSaving(true);
    const result = await updateContactField(row.id, column.key, next);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, [column.key]: next } : item)));
    setEditing((current) => (current && `${current.id}:${current.key}` === token ? null : current));
    setError(null);
    router.refresh();
  }

  useEffect(() => {
    if (!editing || !editingRow || !editingColumn) return;
    if (editingColumn.kind !== "text" && editingColumn.kind !== "date") return;
    const row = editingRow;
    const column = editingColumn;
    function onPointerDown(event: PointerEvent) {
      const input = document.querySelector<HTMLInputElement>("input.cell-input");
      if (!input) return;
      if (event.target instanceof Node && (event.target === input || input.contains(event.target))) return;
      void commit(row, column, input.value);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [editing, editingRow, editingColumn]);

  async function addContact() {
    setAdding(true);
    setError(null);
    const result = await createBlankContact();
    setAdding(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  function toggleSort(key: keyof Contact) {
    setSort((current) => (current.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  return (
    <div className="sheet-page">
      <header className="sheet-top">
        <div>
          <p className="kicker">Directory</p>
          <h1>All contacts</h1>
        </div>
        <div className="sheet-tools">
          <input
            className="sheet-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, phone, tags"
            aria-label="Search contacts"
          />
          <p className="meta">
            {saving ? "Saving…" : query.trim() ? `${visible.length} of ${rows.length}` : `${rows.length} records`}
          </p>
        </div>
      </header>
      {error ? <p className="banner sheet-banner">{error}</p> : null}
      <div className="sheet-scroll">
        <table className="sheet">
          <thead>
            <tr>
              <th className="rownum" />
              {CONTACT_COLUMNS.map((column) => (
                <th key={column.key} className={column.key === "full_name" ? "sticky" : undefined} style={{ minWidth: column.width }}>
                  <button type="button" onClick={() => toggleSort(column.key)} aria-sort={sort.key === column.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                    {column.label}
                    {sort.key === column.key ? <span>{sort.dir === "asc" ? " ↑" : " ↓"}</span> : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={row.id}>
                <td className="rownum">{index + 1}</td>
                {CONTACT_COLUMNS.map((column) => {
                  const active = editing?.id === row.id && editing.key === column.key;
                  const inline = active && (column.kind === "text" || column.kind === "date");
                  return (
                    <td
                      key={column.key}
                      className={`${column.key === "full_name" ? "sticky" : ""} ${active ? "active" : ""}`}
                      style={{ minWidth: column.width }}
                      onClick={(event) => {
                        if (active) return;
                        openEditor(event, row, column);
                      }}
                    >
                      {inline ? (
                        <input
                          autoFocus
                          className="cell-input"
                          type={column.kind === "date" ? "date" : "text"}
                          defaultValue={column.kind === "date" ? (row[column.key] as string | null) ?? "" : haystack(row[column.key])}
                          aria-label={column.label}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              setEditing(null);
                            }
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void commit(row, column, event.currentTarget.value);
                            }
                          }}
                          onBlur={(event) => {
                            void commit(row, column, event.currentTarget.value);
                          }}
                        />
                      ) : (
                        <CellValue row={row} column={column} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 ? <p className="sheet-empty">No contacts match that search.</p> : null}
        <button className="sheet-add" type="button" onClick={addContact} disabled={adding}>
          + {adding ? "Adding…" : "Add a contact"}
        </button>
      </div>
      {editing && editingRow && editingColumn && editingColumn.kind !== "text" && editingColumn.kind !== "date" ? (
        <CellEditor
          column={editingColumn}
          value={editingRow[editingColumn.key]}
          options={options[editingColumn.key] ?? []}
          rect={editing.rect}
          onCancel={() => setEditing(null)}
          onSave={(value) => void commit(editingRow, editingColumn, value)}
        />
      ) : null}
    </div>
  );
}

function CellValue({ row, column }: { row: Contact; column: ContactColumn }) {
  const value = row[column.key];
  if (column.kind === "tags") {
    const tags = Array.isArray(value) ? value : [];
    if (!tags.length) return <span className="cell-empty" />;
    return (
      <span className="tags">
        {tags.map((tag) => (
          <span key={tag} className={`tag ${tagTone(tag)}`}>
            {tag}
          </span>
        ))}
      </span>
    );
  }
  if (column.kind === "select") {
    if (typeof value !== "string" || !value) return <span className="cell-empty" />;
    return <span className={`tag ${tagTone(value)}`}>{value}</span>;
  }
  if (column.kind === "date") {
    const shown = showDate(typeof value === "string" ? value : null);
    return shown ? <span className="cell-text">{shown}</span> : <span className="cell-empty" />;
  }
  const text = haystack(value);
  if (!text) return <span className="cell-empty" />;
  if (column.key === "full_name") {
    return (
      <span className="name-cell">
        <span className="cell-text">{text}</span>
        <Link href={`/people/${row.id}`} className="open-person" onClick={(event) => event.stopPropagation()} aria-label={`Open ${text}`}>
          Open
        </Link>
      </span>
    );
  }
  return <span className={column.kind === "longtext" ? "cell-text clamp" : "cell-text"}>{text}</span>;
}

function CellEditor({
  column,
  value,
  options,
  rect,
  onSave,
  onCancel,
}: {
  column: ContactColumn;
  value: Contact[keyof Contact];
  options: string[];
  rect: DOMRect;
  onSave: (value: string | string[] | null) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(Array.isArray(value) ? value : []);
  const [text, setText] = useState(typeof value === "string" ? value : "");
  const [query, setQuery] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const placeAbove = window.innerHeight - rect.bottom < 280 && rect.top > 280;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    function onPointer(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) {
        if (column.kind === "tags") onSave(draft);
        else if (column.kind === "longtext") onSave(text);
        else onCancel();
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [column.kind, draft, onCancel, onSave, text]);

  const suggestions = options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase()) && (column.kind === "select" || !draft.includes(option)));

  return (
    <div
      ref={box}
      className="cell-editor"
      style={{
        top: placeAbove ? undefined : rect.bottom + 6,
        bottom: placeAbove ? window.innerHeight - rect.top + 6 : undefined,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 340)),
      }}
    >
      <p className="editor-label">{column.label}</p>
      {column.kind === "tags" ? (
        <>
          <div className="tags">
            {draft.map((tag) => (
              <button key={tag} type="button" className={`tag ${tagTone(tag)}`} onClick={() => setDraft(draft.filter((item) => item !== tag))}>
                {tag} ×
              </button>
            ))}
          </div>
          <input
            autoFocus
            value={query}
            placeholder="Add or find a tag"
            aria-label={`Edit ${column.label}`}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                const next = query.trim();
                if (next && !draft.includes(next)) setDraft([...draft, next]);
                setQuery("");
              }
              if (event.key === "Backspace" && !query && draft.length) setDraft(draft.slice(0, -1));
            }}
          />
          {suggestions.length ? (
            <div className="suggestions">
              {suggestions.slice(0, 8).map((option) => (
                <button key={option} type="button" onClick={() => setDraft([...draft, option])}>
                  <span className={`tag ${tagTone(option)}`}>{option}</span>
                </button>
              ))}
            </div>
          ) : null}
          <button className="primary" type="button" onClick={() => onSave(draft)}>
            Done
          </button>
        </>
      ) : null}
      {column.kind === "select" ? (
        <>
          <input
            autoFocus
            value={text}
            placeholder="Type a value"
            aria-label={`Edit ${column.label}`}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSave(text);
              }
            }}
          />
          <div className="suggestions">
            <button type="button" onClick={() => onSave(null)}>
              Clear
            </button>
            {(query || text ? suggestions.filter((option) => option.toLowerCase().includes(text.trim().toLowerCase())) : options).slice(0, 10).map((option) => (
              <button key={option} type="button" onClick={() => onSave(option)}>
                <span className={`tag ${tagTone(option)}`}>{option}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
      {column.kind === "longtext" ? (
        <>
          <textarea autoFocus value={text} aria-label={`Edit ${column.label}`} onChange={(event) => setText(event.target.value)} />
          <button className="primary" type="button" onClick={() => onSave(text)}>
            Done
          </button>
        </>
      ) : null}
    </div>
  );
}

function haystack(value: Contact[keyof Contact]) {
  if (Array.isArray(value)) return value.join(", ");
  if (value == null) return "";
  return String(value);
}

function compareRows(a: Contact, b: Contact, key: keyof Contact, dir: "asc" | "desc") {
  const left = haystack(a[key]);
  const right = haystack(b[key]);
  if (!left && right) return 1;
  if (left && !right) return -1;
  const compared = left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
  if (compared === 0) return a.full_name.localeCompare(b.full_name);
  return dir === "asc" ? compared : -compared;
}

function cleanValue(value: string | string[] | null, kind: ColumnKind): string | string[] | null {
  if (kind === "tags") {
    const tags = Array.isArray(value) ? value : [];
    return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function sameValue(current: Contact[keyof Contact], next: string | string[] | null) {
  if (Array.isArray(next)) {
    const existing = Array.isArray(current) ? current : [];
    return existing.join("\u0000") === next.join("\u0000");
  }
  return (current ?? "") === (next ?? "");
}
