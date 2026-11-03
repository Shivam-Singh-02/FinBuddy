import type { PropsWithChildren, ReactNode } from "react";

import { useAuth } from "../contexts/AuthContext";
import { NavLink } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";

interface AppShellProps extends PropsWithChildren {
  title?: string;
  description?: string;
  action?: ReactNode;
}

const navigation = [
  { to: "/", label: "Overview", end: true },
  { to: "/credit-cards", label: "Credit cards" },
  { to: "/accounts", label: "Accounts" },
  { to: "/investments", label: "Investments" },
];

export function AppShell({ children, title = "Overview", description, action }: AppShellProps) {
  const { user, logout } = useAuth();

  return (
    <div className="page-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand"><BrandLogo /></div>
        <span className="sidebar-label">Workspace</span>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}>
              <span className="nav-indicator" aria-hidden="true" />{item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-avatar" aria-hidden="true">{user?.full_name?.slice(0, 1).toUpperCase() ?? "U"}</div>
          <div className="user-details"><strong>{user?.full_name}</strong><small>{user?.email}</small></div>
          <button className="icon-button" type="button" onClick={logout} aria-label="Log out" title="Log out">↗</button>
        </div>
      </aside>
      <div className="app-main">
        <header className="page-heading">
          <div><span className="brand-kicker">Personal finance</span><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>
          {action ? <div className="page-heading-action">{action}</div> : null}
        </header>
        <main className="content-stack">{children}</main>
      </div>
    </div>
  );
}

