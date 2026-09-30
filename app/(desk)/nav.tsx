"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const links = [
  { href: "/circles", label: "Circles" },
  { href: "/attendance", label: "Attendance" },
  { href: "/notifications", label: "Notifications" },
];

function isCurrent(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DeskNav() {
  const pathname = usePathname();
  const peopleSection = isCurrent(pathname, "/people") || isCurrent(pathname, "/contacts");
  const [open, setOpen] = useState(peopleSection);
  const wasInSection = useRef(peopleSection);
  useEffect(() => {
    if (peopleSection && !wasInSection.current) setOpen(true);
    wasInSection.current = peopleSection;
  }, [peopleSection]);

  return (
    <nav>
      <Link className="item" data-active={isCurrent(pathname, "/") ? "true" : undefined} href="/">
        Next two weeks
      </Link>
      <div className="group">
        <div className="group-row">
          <Link className="item" data-active={isCurrent(pathname, "/people") ? "true" : undefined} href="/people">
            People
          </Link>
          <button
            className="caret"
            type="button"
            aria-expanded={open}
            aria-label={open ? "Hide people pages" : "Show people pages"}
            onClick={() => setOpen((value) => !value)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : undefined }}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
        {open ? (
          <div className="sub">
            <Link className="item" data-active={isCurrent(pathname, "/contacts") ? "true" : undefined} href="/contacts">
              All contacts
            </Link>
          </div>
        ) : null}
      </div>
      {links.map((link) => (
        <Link key={link.href} className="item" data-active={isCurrent(pathname, link.href) ? "true" : undefined} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
