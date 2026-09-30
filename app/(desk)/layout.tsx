import { logout } from "@/lib/actions";
import { DeskNav } from "./nav";

export const dynamic = "force-dynamic";

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
        <DeskNav />
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
