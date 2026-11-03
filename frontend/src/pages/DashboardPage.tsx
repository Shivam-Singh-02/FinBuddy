import { startTransition, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ApiError } from "../api/client";
import { fetchAccounts, fetchDashboardSummary, fetchDashboardTrend, fetchInvestments } from "../api/finance";
import type { Account, DashboardSummary, DashboardTrend, Investment, Period } from "../api/types";
import { SummaryCard } from "../components/SummaryCard";
import { TrendChart } from "../components/TrendChart";
import { AppShell } from "../layouts/AppShell";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency, formatDate } from "../utils/format";

export function DashboardPage() {
  const { token, user } = useAuth();
  const [period, setPeriod] = useState<Period>("monthly");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<DashboardTrend | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboardData(selectedPeriod: Period) {
    if (!token) return;
    setError(null);
    try {
      const [summaryResponse, trendResponse, accountsResponse, investmentsResponse] = await Promise.all([
        fetchDashboardSummary(token), fetchDashboardTrend(token, selectedPeriod), fetchAccounts(token), fetchInvestments(token),
      ]);
      startTransition(() => {
        setSummary(summaryResponse); setTrend(trendResponse); setAccounts(accountsResponse); setInvestments(investmentsResponse);
      });
    } catch (errorValue) {
      setError(errorValue instanceof ApiError ? errorValue.message : "Unable to load your overview.");
    } finally { setIsLoading(false); }
  }

  useEffect(() => { void loadDashboardData(period); }, [period, token]);

  const recentUpdates = [
    ...accounts.flatMap((account) => account.latest_balance_date ? [{ label: account.account_name, detail: "Account balance", date: account.latest_balance_date, value: account.latest_balance ?? 0 }] : []),
    ...investments.flatMap((investment) => investment.latest_valuation_date ? [{ label: investment.name, detail: "Investment value", date: investment.latest_valuation_date, value: investment.latest_current_value ?? 0 }] : []),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <AppShell title="Overview" description={`A clear snapshot of your finances${user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}.`}>
      {error ? <div className="alert-banner" role="alert">{error}</div> : null}
      {isLoading || !summary || !trend ? <div className="loading-card">Loading your financial snapshot…</div> : <>
        <section className="net-worth-banner">
          <div><span className="eyebrow">Total net worth</span><strong>{formatCurrency(summary.net_worth)}</strong><span className="net-worth-caption">Cash, investments, and long-term savings</span></div>
          <div className="period-control"><label htmlFor="overview-period">Show trend</label><select id="overview-period" value={period} onChange={(event) => setPeriod(event.target.value as Period)}><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
        </section>
        <section className="summary-grid overview-metrics">
          <SummaryCard label="Cash accounts" value={summary.cash_total} accent="slate" subtitle={`${accounts.length} accounts tracked`} />
          <SummaryCard label="Investments" value={summary.investment_current_total} accent="teal" subtitle={`${investments.length} investment groups`} />
          <SummaryCard label="Long-term savings" value={summary.vlti_current_total} accent="amber" subtitle="PF, NPS, and other long-term holdings" />
          <SummaryCard label="Investment gain / loss" value={summary.gain_loss} accent={summary.gain_loss >= 0 ? "green" : "red"} subtitle={`Against ${formatCurrency(summary.investment_principal_total)} principal`} />
        </section>
        <TrendChart trend={trend} />
        <section className="overview-lower-grid">
          <div className="panel quick-actions-panel"><div className="panel-heading"><div><span className="eyebrow">Shortcuts</span><h3>Manage your money</h3></div></div><div className="shortcut-list">
            <Link to="/credit-cards"><span className="shortcut-icon">▤</span><span><strong>Credit cards</strong><small>Upload statements and review spending</small></span><span aria-hidden="true">→</span></Link>
            <Link to="/accounts"><span className="shortcut-icon">⌂</span><span><strong>Accounts</strong><small>Update balances and snapshots</small></span><span aria-hidden="true">→</span></Link>
            <Link to="/investments"><span className="shortcut-icon">↗</span><span><strong>Investments</strong><small>Update values and track performance</small></span><span aria-hidden="true">→</span></Link>
          </div></div>
          <div className="panel"><div className="panel-heading"><div><span className="eyebrow">Latest snapshots</span><h3>Recent updates</h3></div></div>{recentUpdates.length ? <div className="recent-update-list">{recentUpdates.map((item) => <div className="history-row" key={`${item.label}-${item.date}`}><div><strong>{item.label}</strong><small>{item.detail} · {formatDate(item.date)}</small></div><strong>{formatCurrency(item.value)}</strong></div>)}</div> : <p>No account or investment snapshots yet.</p>}</div>
        </section>
      </>}
    </AppShell>
  );
}
