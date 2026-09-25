import Link from "next/link";
import { logout } from "@/lib/actions";

export const dynamic = "force-dynamic";

const links = [
  { href: "/", label: "Next two weeks" },
  { href: "/people", label: "People" },
  { href: "/circles", label: "Circles" },
];

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="nav">
        <div className="brand">
          <img src="/mark.png" alt="" />
          <div>
            <strong>Hearth</strong>
            <small>Circle desk</small>
          </div>
        </div>
        <nav>
          {links.map((link) => (
            <Link key={link.href} className="item" href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <form action={logout} style={{ marginTop: 28 }}>
          <button className="link" type="submit">
            Sign out
          </button>
        </form>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}
