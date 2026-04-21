import { startTransition, useEffect, useState } from "react";

import { ApiError } from "../api/client";
import {
  addAccountEntry,
  addInvestmentEntry,
  createAccount,
  createInvestment,
  fetchAccounts,
  fetchDashboardSummary,
  fetchDashboardTrend,
  fetchInvestments,
} from "../api/finance";
import type {
  Account,
  AddAccountEntryPayload,
  AddInvestmentEntryPayload,
  CreateAccountPayload,
  CreateInvestmentPayload,
  DashboardSummary,
  DashboardTrend,
  Investment,
  Period,
} from "../api/types";
import { AccountSection } from "../components/AccountSection";
import { InvestmentSection } from "../components/InvestmentSection";
import { SummaryCard } from "../components/SummaryCard";
import { TrendChart } from "../components/TrendChart";
import { AppShell } from "../layouts/AppShell";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency } from "../utils/format";


export function DashboardPage() {
  const { token, user } = useAuth();
  const [period, setPeriod] = useState<Period>("weekly");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<DashboardTrend | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboardData(selectedPeriod: Period) {
    if (!token) {
      return;
    }

    setError(null);

    try {
      const [summaryResponse, trendResponse, accountsResponse, investmentsResponse] = await Promise.all([
        fetchDashboardSummary(token),
        fetchDashboardTrend(token, selectedPeriod),
        fetchAccounts(token),
        fetchInvestments(token),
      ]);

      startTransition(() => {
        setSummary(summaryResponse);
        setTrend(trendResponse);
        setAccounts(accountsResponse);
        setInvestments(investmentsResponse);
      });
    } catch (errorValue) {
      setError(errorValue instanceof ApiError ? errorValue.message : "Unable to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboardData(period);
  }, [period, token]);

  async function handleCreateAccount(payload: CreateAccountPayload) {
    if (!token) {
      return;
    }

    setIsSaving(true);
    try {
      await createAccount(token, payload);
      await loadDashboardData(period);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddAccountEntry(accountId: string, payload: AddAccountEntryPayload) {
    if (!token) {
      return;
    }

    setIsSaving(true);
    try {
      await addAccountEntry(token, accountId, payload);
      await loadDashboardData(period);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateInvestment(payload: CreateInvestmentPayload) {
    if (!token) {
      return;
    }

    setIsSaving(true);
    try {
      await createInvestment(token, payload);
      await loadDashboardData(period);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddInvestmentEntry(investmentId: string, payload: AddInvestmentEntryPayload) {
    if (!token) {
      return;
    }

    setIsSaving(true);
    try {
      await addInvestmentEntry(token, investmentId, payload);
      await loadDashboardData(period);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <section className="hero-card">
        <div>
          <span className="eyebrow">Overview</span>
          <h2>Welcome back, {user?.full_name?.split(" ")[0]}</h2>
          <p>
            Keep feeding FinBuddy your latest balances and valuations. The dashboard will smooth those snapshots
            into a cleaner story of how your money is moving.
          </p>
        </div>
        <div className="hero-meta">
          <span>Tracking mode</span>
          <strong>{period === "weekly" ? "Week on week" : "Month on month"}</strong>
          <select value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </section>

      {error ? <div className="alert-banner">{error}</div> : null}

      {isLoading || !summary || !trend ? (
        <div className="loading-card">Loading your financial snapshot...</div>
      ) : (
        <>
          <section className="summary-grid">
            <SummaryCard
              label="Net Worth"
              value={summary.net_worth}
              accent="teal"
              subtitle="Bank balances plus current investment value."
            />
            <SummaryCard
              label="Bank Accounts"
              value={summary.cash_total}
              accent="slate"
              subtitle={`${accounts.length} accounts currently tracked.`}
            />
            <SummaryCard
              label="Investment Value"
              value={summary.investment_current_total}
              accent="amber"
              subtitle={`${investments.length} investment buckets in motion.`}
            />
            <SummaryCard
              label="Portfolio Gain / Loss"
              value={summary.gain_loss}
              accent="slate"
              subtitle={`Against principal of ${formatCurrency(summary.investment_principal_total)}.`}
            />
          </section>

          <TrendChart trend={trend} />

          <section className="two-column-grid">
            <AccountSection
              accounts={accounts}
              isBusy={isSaving}
              onCreateAccount={handleCreateAccount}
              onAddEntry={handleAddAccountEntry}
            />
            <InvestmentSection
              investments={investments}
              isBusy={isSaving}
              onCreateInvestment={handleCreateInvestment}
              onAddEntry={handleAddInvestmentEntry}
            />
          </section>
        </>
      )}
    </AppShell>
  );
}

