import { useState, type FormEvent } from "react";

import type { ExpenseReport } from "../api/types";
import { formatCurrency, formatDate } from "../utils/format";


interface ExpenseTrackerSectionProps {
  reports: ExpenseReport[];
  isBusy: boolean;
  onImport: (file: File) => Promise<void>;
}


export function ExpenseTrackerSection({ reports, isBusy, onImport }: ExpenseTrackerSectionProps) {
  const [file, setFile] = useState<File | null>(null);
  const latestReport = reports[0];
  const parserLabel = latestReport?.parser === "bedrock"
    ? "Bedrock parsed"
    : latestReport?.parser === "openai"
      ? "OpenAI parsed"
      : "Local parsed";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!file) {
      return;
    }

    await onImport(file);
    setFile(null);
    formElement.reset();
  }

  return (
    <section className="panel expense-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Expense Tracker</span>
          <h3>Import account statement</h3>
        </div>
        {latestReport ? (
          <div className="expense-total">
            <span>{parserLabel}</span>
            <strong>{formatCurrency(latestReport.total_spend)}</strong>
          </div>
        ) : null}
      </div>

      <form className="expense-upload-form" onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          required
        />
        <button className="primary-button" type="submit" disabled={isBusy || !file}>
          {isBusy ? "Parsing..." : "Import"}
        </button>
      </form>

      {latestReport ? (
        <div className="expense-report-grid">
          <div className="expense-summary-list">
            <div className="history-row">
              <span>Period</span>
              <strong>
                {formatDate(latestReport.statement_period_start)} - {formatDate(latestReport.statement_period_end)}
              </strong>
            </div>
            {latestReport.category_totals.map((item) => (
              <div className="history-row" key={item.category}>
                <span>
                  {item.category} ({item.transaction_count})
                </span>
                <strong>{formatCurrency(item.total)}</strong>
              </div>
            ))}
          </div>

          <div className="expense-table-wrap">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {latestReport.transactions.slice(0, 12).map((transaction) => (
                  <tr key={`${transaction.transaction_date}-${transaction.description}-${transaction.amount}`}>
                    <td>{formatDate(transaction.transaction_date)}</td>
                    <td>{transaction.merchant ?? transaction.description}</td>
                    <td>{transaction.category}</td>
                    <td>{formatCurrency(transaction.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p>Upload a PDF or Excel statement to generate a categorical expense report.</p>
      )}
    </section>
  );
}
