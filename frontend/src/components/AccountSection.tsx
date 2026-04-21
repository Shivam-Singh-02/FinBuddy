import { useState, type FormEvent } from "react";

import type { Account, AddAccountEntryPayload, CreateAccountPayload } from "../api/types";
import { formatCurrency, formatDate, todayInputValue } from "../utils/format";


interface AccountSectionProps {
  accounts: Account[];
  isBusy: boolean;
  onCreateAccount: (payload: CreateAccountPayload) => Promise<void>;
  onAddEntry: (accountId: string, payload: AddAccountEntryPayload) => Promise<void>;
}

const initialAccountForm = {
  institution_name: "",
  account_name: "",
  account_type: "Savings Account",
  notes: "",
  initial_balance: "",
  balance_date: todayInputValue(),
};


export function AccountSection({
  accounts,
  isBusy,
  onCreateAccount,
  onAddEntry,
}: AccountSectionProps) {
  const [form, setForm] = useState(initialAccountForm);
  const [entryFormById, setEntryFormById] = useState<Record<string, { balance: string; as_of_date: string }>>({});

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onCreateAccount({
      ...form,
      initial_balance: Number(form.initial_balance),
    });

    setForm(initialAccountForm);
  }

  async function handleAddEntry(accountId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formState = entryFormById[accountId];
    if (!formState) {
      return;
    }

    await onAddEntry(accountId, {
      balance: Number(formState.balance),
      as_of_date: formState.as_of_date,
    });

    setEntryFormById((current) => ({
      ...current,
      [accountId]: { balance: "", as_of_date: todayInputValue() },
    }));
  }

  return (
    <section className="panel-stack">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Bank Accounts</span>
            <h3>Add an account snapshot</h3>
          </div>
        </div>
        <form className="form-grid" onSubmit={handleCreateAccount}>
          <input
            value={form.institution_name}
            onChange={(event) => setForm((current) => ({ ...current, institution_name: event.target.value }))}
            placeholder="Institution name"
            required
          />
          <input
            value={form.account_name}
            onChange={(event) => setForm((current) => ({ ...current, account_name: event.target.value }))}
            placeholder="Account name"
            required
          />
          <input
            value={form.account_type}
            onChange={(event) => setForm((current) => ({ ...current, account_type: event.target.value }))}
            placeholder="Account type"
            required
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.initial_balance}
            onChange={(event) => setForm((current) => ({ ...current, initial_balance: event.target.value }))}
            placeholder="Current balance"
            required
          />
          <input
            type="date"
            value={form.balance_date}
            onChange={(event) => setForm((current) => ({ ...current, balance_date: event.target.value }))}
            required
          />
          <input
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Notes (optional)"
          />
          <button className="primary-button" type="submit" disabled={isBusy}>
            {isBusy ? "Saving..." : "Add account"}
          </button>
        </form>
      </div>

      <div className="list-grid">
        {accounts.map((account) => {
          const entryForm = entryFormById[account.id] ?? { balance: "", as_of_date: todayInputValue() };

          return (
            <article className="asset-card" key={account.id}>
              <div className="asset-card-top">
                <div>
                  <h4>{account.account_name}</h4>
                  <p>
                    {account.institution_name} • {account.account_type}
                  </p>
                </div>
                <div className="asset-amount">
                  <strong>{formatCurrency(account.latest_balance)}</strong>
                  <span>{formatDate(account.latest_balance_date)}</span>
                </div>
              </div>

              {account.notes ? <p className="asset-notes">{account.notes}</p> : null}

              <form className="mini-form" onSubmit={(event) => void handleAddEntry(account.id, event)}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="New balance"
                  value={entryForm.balance}
                  onChange={(event) =>
                    setEntryFormById((current) => ({
                      ...current,
                      [account.id]: { ...entryForm, balance: event.target.value },
                    }))
                  }
                  required
                />
                <input
                  type="date"
                  value={entryForm.as_of_date}
                  onChange={(event) =>
                    setEntryFormById((current) => ({
                      ...current,
                      [account.id]: { ...entryForm, as_of_date: event.target.value },
                    }))
                  }
                  required
                />
                <button className="secondary-button" type="submit" disabled={isBusy}>
                  Add snapshot
                </button>
              </form>

              <div className="history-list">
                {account.recent_entries.map((entry) => (
                  <div className="history-row" key={entry.id}>
                    <span>{formatDate(entry.as_of_date)}</span>
                    <strong>{formatCurrency(entry.balance)}</strong>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
