"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Next two weeks" },
  { href: "/contacts", label: "All contacts" },
  { href: "/people", label: "People" },
  { href: "/circles", label: "Circles" },
  { href: "/attendance", label: "Attendance" },
  { href: "/notifications", label: "Notifications" },
];

export function DeskNav() {
  const pathname = usePathname();
  return (
    <nav>
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link key={link.href} className="item" data-active={active ? "true" : undefined} href={link.href}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
