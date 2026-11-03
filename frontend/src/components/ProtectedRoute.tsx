import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";


export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="page-shell centered-shell">
        <div className="loading-card">Loading your workspace...</div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
