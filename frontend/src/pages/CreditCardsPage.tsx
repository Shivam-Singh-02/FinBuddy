import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ApiError } from "../api/client";
import { createCreditCard, deleteCreditCard, fetchCardAnalysis, fetchCreditCards, importAndDetectCardStatement, importCardStatement, updateCardTransactionCategory, updateCreditCard } from "../api/finance";
import type { CardAnalysis, CreditCard } from "../api/types";
import { useAuth } from "../contexts/AuthContext";
import { AppShell } from "../layouts/AppShell";
import { formatCurrency, formatDate } from "../utils/format";

const CATEGORIES = ["Food & Dining", "Groceries", "Shopping", "Transport", "Travel", "Bills & Utilities", "Rent & Housing", "Healthcare", "Entertainment", "Education", "Fees & Charges", "Transfers", "Investments", "Income", "Other"];
type ImportNotice = { card: CreditCard; needsReview: boolean; reason?: string | null };

export function CreditCardsPage() {
  const { token } = useAuth();
  const { cardId } = useParams();
  const navigate = useNavigate();
  const overall = useLocation().pathname === "/credit-cards/analysis";
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [analysis, setAnalysis] = useState<CardAnalysis | null>(null);
  const [issuer, setIssuer] = useState("");
  const [name, setName] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [limit, setLimit] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<ImportNotice | null>(null);
  const [reviewIssuer, setReviewIssuer] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [reviewLastFour, setReviewLastFour] = useState("");

  const reload = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      const [cardList, report] = await Promise.all([fetchCreditCards(token), fetchCardAnalysis(token, cardId)]);
      setCards(cardList);
      setAnalysis(report);
    } catch (value) {
      setError(value instanceof ApiError ? value.message : "Unable to load card data.");
    }
  }, [token, cardId]);

  useEffect(() => { void reload(); }, [reload]);

  async function handleManualCreate(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true); setError("");
    try {
      await createCreditCard(token, { issuer, name, last_four: lastFour || undefined, credit_limit: limit ? Number(limit) : undefined });
      setIssuer(""); setName(""); setLastFour(""); setLimit("");
      await reload();
    } catch (value) { setError(value instanceof ApiError ? value.message : "Unable to add the card."); }
    finally { setBusy(false); }
  }

  async function handleAutoImport(event: FormEvent) {
    event.preventDefault();
    if (!token || !file) return;
    setBusy(true); setError(""); setNotice(null);
    try {
      const result = await importAndDetectCardStatement(token, file);
      setNotice({ card: result.card, needsReview: result.card_detection?.needs_review ?? false, reason: result.card_detection?.reason });
      setReviewIssuer(result.card.issuer); setReviewName(result.card.name); setReviewLastFour(result.card.last_four ?? "");
      setFile(null);
      await reload();
    } catch (value) { setError(value instanceof ApiError ? value.message : "Unable to analyze this statement."); }
    finally { setBusy(false); }
  }

  async function handleSelectedImport(event: FormEvent) {
    event.preventDefault();
    if (!token || !cardId || !file) return;
    setBusy(true); setError("");
    try { await importCardStatement(token, cardId, file); setFile(null); await reload(); }
    catch (value) { setError(value instanceof ApiError ? value.message : "Unable to import the statement."); }
    finally { setBusy(false); }
  }

  async function saveDetectedCard(event: FormEvent) {
    event.preventDefault();
    if (!token || !notice) return;
    setBusy(true); setError("");
    try {
      const updated = await updateCreditCard(token, notice.card.id, { issuer: reviewIssuer, name: reviewName, last_four: reviewLastFour || null });
      setNotice({ card: updated, needsReview: false });
      await reload();
    } catch (value) { setError(value instanceof ApiError ? value.message : "Unable to update card details."); }
    finally { setBusy(false); }
  }

  async function handleDeleteCard() {
    if (!token || !cardId || !selectedCard) return;
    const confirmed = window.confirm(`Remove ${selectedCard.name}? This will permanently delete this card and all its statements and transactions.`);
    if (!confirmed) return;
    setBusy(true); setError("");
    try {
      await deleteCreditCard(token, cardId);
      navigate("/credit-cards", { replace: true });
    } catch (value) {
      setError(value instanceof ApiError ? value.message : "Unable to remove this card.");
    } finally { setBusy(false); }
  }

  async function changeCategory(transactionId: string | undefined, transactionCardId: string, category: string) {
    if (!token || !transactionId) return;
    try { await updateCardTransactionCategory(token, transactionCardId, transactionId, category); await reload(); }
    catch (value) { setError(value instanceof ApiError ? value.message : "Unable to update the category."); }
  }

  const selectedCard = cards.find((card) => card.id === cardId);
  const title = overall ? "Card overview" : selectedCard?.name ?? "Credit cards";
  const description = overall ? "Compare spending across all your cards." : selectedCard ? `${selectedCard.issuer}${selectedCard.last_four ? ` · ending ${selectedCard.last_four}` : ""}` : "Add a statement to get your card analysis started.";
  return <AppShell title={title} description={description}>
    {error ? <div className="alert-banner" role="alert">{error}</div> : null}
    {!cardId ? <>
      <div className="section-tabs" role="tablist" aria-label="Credit card views">
        <Link to="/credit-cards" className={!overall ? "section-tab is-active" : "section-tab"}>My cards <span>{cards.length}</span></Link>
        <Link to="/credit-cards/analysis" className={overall ? "section-tab is-active" : "section-tab"}>Overall analysis</Link>
      </div>
      {!overall ? <>
        <section className="upload-card">
          <div className="upload-card-copy"><span className="eyebrow">Start with a statement</span><h2>See where your card spend goes</h2><p>Upload a PDF or spreadsheet. FinBuddy will identify the card details and organize its transactions.</p></div>
          <form className="statement-dropzone" onSubmit={handleAutoImport}>
            <label className="file-picker"><span className="file-picker-icon" aria-hidden="true">↑</span><span><strong>{file?.name ?? "Choose a statement"}</strong><small>PDF, XLS, or XLSX · up to 20 MB</small></span><input type="file" accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /></label>
            <button className="primary-button" type="submit" disabled={busy || !file}>{busy ? "Reading statement…" : "Analyze statement"}</button>
          </form>
        </section>
        {notice ? <section className={notice.needsReview ? "detection-review" : "import-success"}>
          <div className="detection-status"><span className="status-icon" aria-hidden="true">{notice.needsReview ? "!" : "✓"}</span><div><strong>{notice.needsReview ? "Review detected card details" : "Statement imported"}</strong><p>{notice.reason ?? `${notice.card.issuer} · ${notice.card.last_four ? `ending ${notice.card.last_four}` : notice.card.name}`}</p></div></div>
          {notice.needsReview ? <form className="detected-card-form" onSubmit={(event) => void saveDetectedCard(event)}><label>Issuer<input value={reviewIssuer} onChange={(event) => setReviewIssuer(event.target.value)} required /></label><label>Card name<input value={reviewName} onChange={(event) => setReviewName(event.target.value)} required /></label><label>Last four digits<input value={reviewLastFour} maxLength={4} onChange={(event) => setReviewLastFour(event.target.value.replace(/\D/g, ""))} /></label><button className="secondary-button" disabled={busy}>Save card details</button></form> : <Link to={`/credit-cards/${notice.card.id}`} className="text-link">Open card analysis →</Link>}
        </section> : null}
        <section className="page-section"><div className="section-heading"><div><span className="eyebrow">Your wallet</span><h2>Cards</h2></div><details className="manual-card-disclosure"><summary>Add card manually</summary><form className="manual-card-form" onSubmit={(event) => void handleManualCreate(event)}><label>Issuer<input value={issuer} onChange={(event) => setIssuer(event.target.value)} placeholder="e.g. HDFC Bank" required /></label><label>Card name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Regalia Gold" required /></label><label>Last four<input value={lastFour} maxLength={4} onChange={(event) => setLastFour(event.target.value.replace(/\D/g, ""))} /></label><label>Credit limit<input type="number" min="1" value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="Optional" /></label><button className="primary-button" disabled={busy}>Add card</button></form></details></div>
          {cards.length ? <div className="card-grid">{cards.map((card) => <Link to={`/credit-cards/${card.id}`} className="credit-card-tile" key={card.id}><div className="credit-card-tile-top"><span className="card-chip" aria-hidden="true" /><span className="card-brand">{card.issuer}</span></div><div className="credit-card-tile-name">{card.name}</div><div className="credit-card-tile-bottom"><span>{card.last_four ? `•••• ${card.last_four}` : "Card details"}</span><span aria-hidden="true">→</span></div></Link>)}</div> : <div className="empty-state"><span className="empty-state-icon">▤</span><h3>No cards yet</h3><p>Upload your first statement and we’ll create the card from its details.</p></div>}
        </section>
      </> : <AnalysisView analysis={analysis} cards={cards} onCategoryChange={changeCategory} />}
    </> : <>
      <div className="card-detail-toolbar"><div className="card-toolbar-actions"><Link to="/credit-cards" className="back-link">← All cards</Link>{selectedCard ? <button className="danger-button" type="button" onClick={() => void handleDeleteCard()} disabled={busy}>Remove card</button> : null}</div><form className="inline-upload-form" onSubmit={(event) => void handleSelectedImport(event)}><label className="compact-file-picker">{file?.name ?? "Choose statement"}<input type="file" accept=".pdf,.xlsx,.xls" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /></label><button className="secondary-button" disabled={busy || !file}>{busy ? "Importing…" : "Import to this card"}</button></form></div>
      <AnalysisView analysis={analysis} cards={cards} selectedCardId={cardId} onCategoryChange={changeCategory} />
    </>}
  </AppShell>;
}

function AnalysisView({ analysis, cards, selectedCardId, onCategoryChange }: { analysis: CardAnalysis | null; cards: CreditCard[]; selectedCardId?: string; onCategoryChange: (id: string | undefined, cardId: string, category: string) => Promise<void> }) {
  const [cardFilter, setCardFilter] = useState("all");
  const [amountSort, setAmountSort] = useState<"recent" | "low-to-high" | "high-to-low">("recent");
  const transactions = analysis?.recent_transactions ?? [];
  const filteredTransactions = transactions.filter((transaction) => selectedCardId || cardFilter === "all" || transaction.card_id === cardFilter);
  const visibleTransactions = amountSort === "recent"
    ? filteredTransactions
    : [...filteredTransactions].sort((left, right) => amountSort === "low-to-high" ? left.amount - right.amount : right.amount - left.amount);
  return <>
    <section className="summary-grid analysis-metrics">
      <article className="summary-card summary-card-primary"><span>Purchases</span><strong>{formatCurrency(analysis?.total_spend ?? 0)}</strong></article>
      <article className="summary-card"><span>Refunds</span><strong>{formatCurrency(analysis?.refunds ?? 0)}</strong></article>
      <article className="summary-card"><span>Fees</span><strong>{formatCurrency(analysis?.fees ?? 0)}</strong></article>
      <article className="summary-card"><span>Transactions</span><strong>{analysis?.transaction_count ?? 0}</strong></article>
    </section>
    <section className="analysis-grid">
      <div className="panel analysis-chart-panel"><div className="section-heading"><div><span className="eyebrow">Spending pattern</span><h2>Monthly spend</h2></div></div>{analysis?.monthly_trend.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={analysis.monthly_trend} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf0f4" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#718096", fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#718096", fontSize: 12 }} tickFormatter={(value: number) => new Intl.NumberFormat("en-IN", { notation: "compact" }).format(value)} /><Tooltip formatter={(value: number) => formatCurrency(value)} /><Bar dataKey="total" fill="#168b79" radius={[6, 6, 0, 0]} maxBarSize={46} /></BarChart></ResponsiveContainer></div> : <p className="chart-empty">Monthly spending will appear after a statement is imported.</p>}</div>
      <div className="panel"><div className="section-heading"><div><span className="eyebrow">Where it goes</span><h2>Categories</h2></div></div>{analysis?.category_totals.length ? <div className="breakdown-list">{analysis.category_totals.map((item) => <div className="breakdown-row" key={item.category}><div><span>{item.category}</span><strong>{formatCurrency(item.total)}</strong></div><div className="breakdown-track"><span style={{ width: `${Math.min(100, analysis.total_spend ? item.total / analysis.total_spend * 100 : 0)}%` }} /></div></div>)}</div> : <p className="chart-empty">Category totals will appear here.</p>}</div>
    </section>
    {!selectedCardId ? <section className="panel card-comparison"><div className="section-heading"><div><span className="eyebrow">Across your wallet</span><h2>Cards</h2></div></div><div className="comparison-list">{cards.map((card) => { const spend = analysis?.card_totals.find((item) => item.card_id === card.id)?.total_spend ?? 0; return <Link key={card.id} to={`/credit-cards/${card.id}`}><span className="comparison-dot" /><span className="comparison-name"><strong>{card.name}</strong><small>{card.issuer}{card.last_four ? ` · •••• ${card.last_four}` : ""}</small></span><strong>{formatCurrency(spend)}</strong><span aria-hidden="true">→</span></Link>; })}{!cards.length ? <p>No cards have been added yet.</p> : null}</div></section> : null}
    <section className="panel transaction-panel">
      <div className="section-heading">
        <div><span className="eyebrow">Statement activity</span><h2>Transactions</h2></div>
        <div className="transaction-toolbar">
          {!selectedCardId ? <label className="transaction-control"><span>Filter by card</span><select value={cardFilter} onChange={(event) => setCardFilter(event.target.value)} aria-label="Filter transactions by card"><option value="all">All cards</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}{card.last_four ? ` · •••• ${card.last_four}` : ""}</option>)}</select></label> : null}
          <label className="transaction-control"><span>Sort by amount</span><select value={amountSort} onChange={(event) => setAmountSort(event.target.value as typeof amountSort)} aria-label="Sort transactions by amount"><option value="recent">Recent order</option><option value="low-to-high">Lowest first</option><option value="high-to-low">Highest first</option></select></label>
          <span className="result-count">{visibleTransactions.length === transactions.length ? `${transactions.length} recent` : `${visibleTransactions.length} of ${transactions.length} recent`}</span>
        </div>
      </div>
      {visibleTransactions.length ? <div className="expense-table-wrap"><table className="expense-table transaction-table"><thead><tr><th>Transaction</th><th>Card</th><th>Date</th><th>Category</th><th>Amount</th></tr></thead><tbody>{visibleTransactions.map((transaction, index) => { const card = cards.find((item) => item.id === transaction.card_id); return <tr key={transaction.transaction_id ?? `${transaction.transaction_date}-${index}`}><td><strong>{transaction.merchant || transaction.description}</strong><small>{transaction.description}</small></td><td>{card?.name ?? "Card"}</td><td>{formatDate(transaction.transaction_date)}</td><td><select value={transaction.category} onChange={(event) => void onCategoryChange(transaction.transaction_id ?? undefined, transaction.card_id, event.target.value)} aria-label={`Category for ${transaction.merchant || transaction.description}`}>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></td><td className="amount-cell">{formatCurrency(transaction.amount)}</td></tr>; })}</tbody></table></div> : transactions.length ? <div className="empty-state compact-empty"><h3>No transactions match this card</h3><p>Choose another card to see its activity.</p><button className="secondary-button" type="button" onClick={() => setCardFilter("all")}>Show all cards</button></div> : <div className="empty-state compact-empty"><h3>No transactions for this period</h3><p>Import a statement to see card activity here.</p></div>}
    </section>
  </>;
}
