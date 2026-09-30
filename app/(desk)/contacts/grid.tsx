"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createBlankContact, updateContactField } from "@/lib/actions";
import { CONTACT_COLUMNS, showDate, tagTone, type ColumnKind, type Contact, type ContactColumn } from "@/lib/contacts";

type EditState = { id: number; key: keyof Contact; rect: DOMRect };
type FilterState = Partial<Record<keyof Contact, string[]>>;
const BLANK = "\u0000blank";
const MIN_WIDTH = 72;
const WIDTH_KEY = "hearth-contact-widths";

function defaultWidths() {
  return Object.fromEntries(CONTACT_COLUMNS.map((column) => [column.key, column.width])) as Record<string, number>;
}

export function ContactGrid({ contacts, options }: { contacts: Contact[]; options: Record<string, string[]> }) {
  const router = useRouter();
  const [rows, setRows] = useState(contacts);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [filterMenu, setFilterMenu] = useState<{ key: keyof Contact; rect: DOMRect } | null>(null);
  const [widths, setWidths] = useState(defaultWidths);
  const [widthsReady, setWidthsReady] = useState(false);
  const [sort, setSort] = useState<{ key: keyof Contact; dir: "asc" | "desc" }>({ key: "full_name", dir: "asc" });
  const [editing, setEditing] = useState<EditState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    if (!editing) setRows(contacts);
  }, [contacts, editing]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(WIDTH_KEY) || "null") as Record<string, unknown> | null;
      if (saved && typeof saved === "object") {
        setWidths((current) => {
          const next = { ...current };
          for (const column of CONTACT_COLUMNS) {
            const value = Number(saved[column.key]);
            if (Number.isFinite(value) && value >= MIN_WIDTH) next[column.key] = value;
          }
          return next;
        });
      }
    } catch {
      /* keep the default widths */
    }
    setWidthsReady(true);
  }, []);

  useEffect(() => {
    if (!widthsReady) return;
    localStorage.setItem(WIDTH_KEY, JSON.stringify(widths));
  }, [widths, widthsReady]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (needle && !CONTACT_COLUMNS.some((column) => haystack(row[column.key]).toLowerCase().includes(needle))) return false;
      return rowMatchesFilters(row, filters);
    });
    return [...filtered].sort((a, b) => compareRows(a, b, sort.key, sort.dir));
  }, [rows, query, filters, sort]);

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

  function startResize(event: React.PointerEvent<HTMLSpanElement>, key: keyof Contact) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = widths[key] ?? MIN_WIDTH;
    document.body.classList.add("resizing-col");
    function move(moveEvent: PointerEvent) {
      const next = Math.max(MIN_WIDTH, Math.round(startWidth + moveEvent.clientX - startX));
      setWidths((current) => (current[key] === next ? current : { ...current, [key]: next }));
    }
    function stop() {
      document.body.classList.remove("resizing-col");
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", stop);
    }
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
  }

  const filtering = Boolean(query.trim()) || Object.keys(filters).length > 0;
  const filterColumn = filterMenu ? CONTACT_COLUMNS.find((column) => column.key === filterMenu.key) : undefined;
  const tableWidth = 46 + CONTACT_COLUMNS.reduce((sum, column) => sum + (widths[column.key] ?? column.width), 0);

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
          {Object.keys(filters).length ? (
            <button className="linkish" type="button" onClick={() => setFilters({})}>
              Clear filters
            </button>
          ) : null}
          <p className="meta">
            {saving ? "Saving…" : filtering ? `${visible.length} of ${rows.length}` : `${rows.length} records`}
          </p>
        </div>
      </header>
      {error ? <p className="banner sheet-banner">{error}</p> : null}
      <div className="sheet-scroll">
        <table className="sheet" style={{ width: tableWidth, minWidth: tableWidth }}>
          <thead>
            <tr>
              <th className="rownum" />
              {CONTACT_COLUMNS.map((column) => (
                <th key={column.key} className={column.key === "full_name" ? "sticky" : undefined} style={columnStyle(widths[column.key])}>
                  <div className="head-cell">
                    <button className="sort" type="button" onClick={() => toggleSort(column.key)} aria-sort={sort.key === column.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                      {column.label}
                      {sort.key === column.key ? <span>{sort.dir === "asc" ? " ↑" : " ↓"}</span> : null}
                    </button>
                    <button
                      className="filter"
                      type="button"
                      data-on={filters[column.key] ? "true" : undefined}
                      aria-label={`Filter ${column.label}`}
                      aria-expanded={filterMenu?.key === column.key}
                      onClick={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        setFilterMenu((current) => (current?.key === column.key ? null : { key: column.key, rect }));
                      }}
                    >
                      <FilterIcon />
                    </button>
                  </div>
                  <button
                    className="col-resize"
                    type="button"
                    aria-label={`Resize ${column.label}`}
                    onPointerDown={(event) => startResize(event, column.key)}
                    onDoubleClick={() => setWidths((current) => ({ ...current, [column.key]: column.width }))}
                  />
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
                      style={columnStyle(widths[column.key])}
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
        {visible.length === 0 ? <p className="sheet-empty">No contacts match.</p> : null}
        <button className="sheet-add" type="button" onClick={addContact} disabled={adding}>
          + {adding ? "Adding…" : "Add a contact"}
        </button>
      </div>
      {filterMenu && filterColumn ? (
        <ColumnFilter
          column={filterColumn}
          rows={rows}
          selected={filters[filterColumn.key]}
          rect={filterMenu.rect}
          onChange={(selected) => setFilters((current) => ({ ...current, [filterColumn.key]: selected }))}
          onClear={() =>
            setFilters((current) => {
              const next = { ...current };
              delete next[filterColumn.key];
              return next;
            })
          }
          onClose={() => setFilterMenu(null)}
        />
      ) : null}
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

function ColumnFilter({
  column,
  rows,
  selected,
  rect,
  onChange,
  onClear,
  onClose,
}: {
  column: ContactColumn;
  rows: Contact[];
  selected: string[] | undefined;
  rect: DOMRect;
  onChange: (selected: string[]) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const values = useMemo(() => columnValues(rows, column), [rows, column]);
  const needle = search.trim().toLowerCase();
  const shown = needle ? values.filter((value) => filterLabel(value).toLowerCase().includes(needle)) : values;
  const placeAbove = window.innerHeight - rect.bottom < 320 && rect.top > 320;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onPointer(event: MouseEvent) {
      if (box.current?.contains(event.target as Node)) return;
      if (event.target instanceof Element && event.target.closest("button.filter")) return;
      onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [onClose]);

  function toggle(value: string) {
    const current = selected ?? values;
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    if (next.length === values.length) onClear();
    else onChange(next);
  }

  return (
    <div
      ref={box}
      className="cell-editor filter-menu"
      style={{
        top: placeAbove ? undefined : rect.bottom + 6,
        bottom: placeAbove ? window.innerHeight - rect.top + 6 : undefined,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 300)),
      }}
    >
      <p className="editor-label">Filter {column.label}</p>
      <input autoFocus value={search} placeholder="Find a value" aria-label={`Find a ${column.label} value`} onChange={(event) => setSearch(event.target.value)} />
      <div className="filter-actions">
        <button type="button" onClick={onClear}>
          Show all
        </button>
      </div>
      <div className="filter-list">
        {shown.map((value) => (
          <label key={value} className="check-row">
            <input type="checkbox" checked={!selected || selected.includes(value)} onChange={() => toggle(value)} />
            <span>{filterLabel(value)}</span>
          </label>
        ))}
        {shown.length === 0 ? <p className="meta">No values match.</p> : null}
      </div>
    </div>
  );
}

function FilterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 3.5h12L9.4 8.8v4.2l-2.8-1.3V8.8L2 3.5z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function columnStyle(width: number | undefined): React.CSSProperties {
  const size = width ?? MIN_WIDTH;
  return { width: size, minWidth: size, maxWidth: size };
}

function columnValues(rows: Contact[], column: ContactColumn) {
  const values = new Set<string>();
  let blank = false;
  for (const row of rows) {
    const parts = pieces(row, column);
    if (!parts.length) blank = true;
    for (const part of parts) values.add(part);
  }
  const list = [...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  if (blank) list.unshift(BLANK);
  return list;
}

function pieces(row: Contact, column: ContactColumn) {
  const value = row[column.key];
  if (column.kind === "tags") return Array.isArray(value) ? value.filter(Boolean) : [];
  if (column.kind === "date") {
    const shown = showDate(typeof value === "string" ? value : null);
    return shown ? [shown] : [];
  }
  const text = haystack(value).trim();
  return text ? [text] : [];
}

function rowMatchesFilters(row: Contact, filters: FilterState) {
  for (const column of CONTACT_COLUMNS) {
    const selected = filters[column.key];
    if (!selected) continue;
    const parts = pieces(row, column);
    if (!parts.length) {
      if (!selected.includes(BLANK)) return false;
      continue;
    }
    if (!parts.some((part) => selected.includes(part))) return false;
  }
  return true;
}

function filterLabel(value: string) {
  return value === BLANK ? "(Blank)" : value;
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
