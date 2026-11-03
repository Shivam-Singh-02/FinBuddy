import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/client";
import { addInvestmentEntry, createInvestment, fetchInvestments } from "../api/finance";
import type { AddInvestmentEntryPayload, CreateInvestmentPayload, Investment } from "../api/types";
import { InvestmentSection } from "../components/InvestmentSection";
import { AppShell } from "../layouts/AppShell";
import { useAuth } from "../contexts/AuthContext";

export function InvestmentsPage() {
  const { token } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!token) return;
    try { setInvestments(await fetchInvestments(token)); } catch (value) { setError(value instanceof ApiError ? value.message : "Unable to load investments."); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);
  async function create(payload: CreateInvestmentPayload) {
    if (!token) return; setBusy(true); setError("");
    try { await createInvestment(token, payload); await load(); } catch (value) { setError(value instanceof ApiError ? value.message : "Unable to add the investment."); } finally { setBusy(false); }
  }
  async function addEntry(id: string, payload: AddInvestmentEntryPayload) {
    if (!token) return; setBusy(true); setError("");
    try { await addInvestmentEntry(token, id, payload); await load(); } catch (value) { setError(value instanceof ApiError ? value.message : "Unable to save the valuation snapshot."); } finally { setBusy(false); }
  }
  return <AppShell title="Investments" description="Keep valuations and principal in one place."><div className="workspace-intro"><span className="workspace-count">{investments.length} {investments.length === 1 ? "investment group" : "investment groups"}</span><span>Add a valuation snapshot to keep performance current.</span></div>{error ? <div className="alert-banner" role="alert">{error}</div> : null}<InvestmentSection investments={investments} isBusy={busy} onCreateInvestment={create} onAddEntry={addEntry} /></AppShell>;
}
