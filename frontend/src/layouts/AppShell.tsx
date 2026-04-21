import type { PropsWithChildren } from "react";

import { useAuth } from "../contexts/AuthContext";


export function AppShell({ children }: PropsWithChildren) {
  const { user, logout } = useAuth();

  return (
    <div className="page-shell">
      <div className="background-orb background-orb-left" />
      <div className="background-orb background-orb-right" />
      <header className="topbar">
        <div>
          <span className="brand-kicker">FinBuddy</span>
          <h1>Your money, one calm dashboard</h1>
        </div>
        <div className="topbar-actions">
          <div className="user-pill">
            <span>{user?.full_name}</span>
            <small>{user?.email}</small>
          </div>
          <button className="secondary-button" type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main className="content-stack">{children}</main>
    </div>
  );
}

