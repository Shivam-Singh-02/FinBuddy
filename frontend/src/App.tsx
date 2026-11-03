import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { CreditCardsPage } from "./pages/CreditCardsPage";
import { AccountsPage } from "./pages/AccountsPage";
import { InvestmentsPage } from "./pages/InvestmentsPage";


export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/credit-cards" element={<ProtectedRoute><CreditCardsPage /></ProtectedRoute>} />
      <Route path="/credit-cards/analysis" element={<ProtectedRoute><CreditCardsPage /></ProtectedRoute>} />
      <Route path="/credit-cards/:cardId" element={<ProtectedRoute><CreditCardsPage /></ProtectedRoute>} />
      <Route path="/accounts" element={<ProtectedRoute><AccountsPage /></ProtectedRoute>} />
      <Route path="/investments" element={<ProtectedRoute><InvestmentsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

