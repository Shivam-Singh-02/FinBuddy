import { useState, type FormEvent } from "react";

import type {
  AddInvestmentEntryPayload,
  CreateInvestmentPayload,
  Investment,
} from "../api/types";
import { formatCurrency, formatDate, todayInputValue } from "../utils/format";


interface InvestmentSectionProps {
  investments: Investment[];
  isBusy: boolean;
  onCreateInvestment: (payload: CreateInvestmentPayload) => Promise<void>;
  onAddEntry: (investmentId: string, payload: AddInvestmentEntryPayload) => Promise<void>;
}

const INVESTMENT_CATEGORIES = [
  "Mutual Fund",
  "Fixed Deposit",
  "Stock",
  "Digital Gold",
  "Bonds",
  "PF",
  "NPS",
] as const;

const initialInvestmentForm = {
  name: "",
  category: "Mutual Fund",
  notes: "",
  initial_invested_amount: "",
  initial_current_value: "",
  valuation_date: todayInputValue(),
};


export function InvestmentSection({
  investments,
  isBusy,
  onCreateInvestment,
  onAddEntry,
}: InvestmentSectionProps) {
  const [form, setForm] = useState(initialInvestmentForm);
  const [entryFormById, setEntryFormById] = useState<
    Record<string, { invested_amount: string; current_value: string; as_of_date: string }>
  >({});

  async function handleCreateInvestment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onCreateInvestment({
      ...form,
      initial_invested_amount: Number(form.initial_invested_amount),
      initial_current_value: Number(form.initial_current_value),
    });

    setForm(initialInvestmentForm);
  }

  async function handleAddEntry(investmentId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formState = entryFormById[investmentId];
    if (!formState) {
      return;
    }

    await onAddEntry(investmentId, {
      invested_amount: Number(formState.invested_amount),
      current_value: Number(formState.current_value),
      as_of_date: formState.as_of_date,
    });

    setEntryFormById((current) => ({
      ...current,
      [investmentId]: {
        invested_amount: "",
        current_value: "",
        as_of_date: todayInputValue(),
      },
    }));
  }

  return (
    <section className="panel-stack">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Investments</span>
            <h3>Track mutual funds, FDs, stocks and more</h3>
          </div>
        </div>
        <form className="form-grid investment-grid" onSubmit={handleCreateInvestment}>
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Platform"
            required
          />
          <select
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            required
          >
            {INVESTMENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.initial_invested_amount}
            onChange={(event) =>
              setForm((current) => ({ ...current, initial_invested_amount: event.target.value }))
            }
            placeholder="Invested amount"
            required
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.initial_current_value}
            onChange={(event) =>
              setForm((current) => ({ ...current, initial_current_value: event.target.value }))
            }
            placeholder="Current value"
            required
          />
          <input
            type="date"
            value={form.valuation_date}
            onChange={(event) => setForm((current) => ({ ...current, valuation_date: event.target.value }))}
            required
          />
          <input
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Notes (optional)"
          />
          <button className="primary-button" type="submit" disabled={isBusy}>
            {isBusy ? "Saving..." : "Add investment"}
          </button>
        </form>
      </div>

      <div className="list-grid">
        {investments.map((investment) => {
          const entryForm = entryFormById[investment.id] ?? {
            invested_amount: "",
            current_value: "",
            as_of_date: todayInputValue(),
          };

          return (
            <article className="asset-card" key={investment.id}>
              <div className="asset-card-top">
                <div>
                  <h4>{investment.name}</h4>
                  <p>{investment.category}</p>
                </div>
                <div className="asset-amount">
                  <strong>{formatCurrency(investment.latest_current_value)}</strong>
                  <span>{formatDate(investment.latest_valuation_date)}</span>
                </div>
              </div>

              {investment.notes ? <p className="asset-notes">{investment.notes}</p> : null}

              <div className="metric-chip-row">
                <div className="metric-chip">
                  <span>Principal</span>
                  <strong>{formatCurrency(investment.latest_invested_amount)}</strong>
                </div>
                <div className={`metric-chip ${
                  ((investment.latest_current_value ?? 0) - (investment.latest_invested_amount ?? 0)) >= 0
                    ? "metric-chip-gain"
                    : "metric-chip-loss"
                }`}>
                  <span>Gain / Loss</span>
                  <strong>
                    {formatCurrency(
                      (investment.latest_current_value ?? 0) - (investment.latest_invested_amount ?? 0),
                    )}
                  </strong>
                </div>
              </div>

              <form className="mini-form investment-mini-form" onSubmit={(event) => void handleAddEntry(investment.id, event)}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Invested amount"
                  value={entryForm.invested_amount}
                  onChange={(event) =>
                    setEntryFormById((current) => ({
                      ...current,
                      [investment.id]: { ...entryForm, invested_amount: event.target.value },
                    }))
                  }
                  required
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Current value"
                  value={entryForm.current_value}
                  onChange={(event) =>
                    setEntryFormById((current) => ({
                      ...current,
                      [investment.id]: { ...entryForm, current_value: event.target.value },
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
                      [investment.id]: { ...entryForm, as_of_date: event.target.value },
                    }))
                  }
                  required
                />
                <button className="secondary-button" type="submit" disabled={isBusy}>
                  Add valuation
                </button>
              </form>

              <div className="history-list">
                {investment.recent_entries.map((entry) => (
                  <div className="history-row" key={entry.id}>
                    <span>{formatDate(entry.as_of_date)}</span>
                    <strong>{formatCurrency(entry.current_value)}</strong>
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
