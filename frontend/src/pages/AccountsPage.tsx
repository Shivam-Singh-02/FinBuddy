import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/client";
import { addAccountEntry, createAccount, fetchAccounts } from "../api/finance";
import type { Account, AddAccountEntryPayload, CreateAccountPayload } from "../api/types";
import { AccountSection } from "../components/AccountSection";
import { AppShell } from "../layouts/AppShell";
import { useAuth } from "../contexts/AuthContext";

export function AccountsPage() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!token) return;
    try { setAccounts(await fetchAccounts(token)); } catch (value) { setError(value instanceof ApiError ? value.message : "Unable to load accounts."); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);
  async function create(payload: CreateAccountPayload) {
    if (!token) return; setBusy(true); setError("");
    try { await createAccount(token, payload); await load(); } catch (value) { setError(value instanceof ApiError ? value.message : "Unable to add the account."); } finally { setBusy(false); }
  }
  async function addEntry(id: string, payload: AddAccountEntryPayload) {
    if (!token) return; setBusy(true); setError("");
    try { await addAccountEntry(token, id, payload); await load(); } catch (value) { setError(value instanceof ApiError ? value.message : "Unable to save the balance snapshot."); } finally { setBusy(false); }
  }
  return <AppShell title="Accounts" description="Track your bank balances over time."><div className="workspace-intro"><span className="workspace-count">{accounts.length} {accounts.length === 1 ? "account" : "accounts"}</span><span>Update a balance whenever you want a fresh snapshot.</span></div>{error ? <div className="alert-banner" role="alert">{error}</div> : null}<AccountSection accounts={accounts} isBusy={busy} onCreateAccount={create} onAddEntry={addEntry} /></AppShell>;
}
