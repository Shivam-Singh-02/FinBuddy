import { apiRequest } from "./client";
import type {
  Account,
  AccountEntry,
  AddAccountEntryPayload,
  AddInvestmentEntryPayload,
  CreateAccountPayload,
  CreateInvestmentPayload,
  DashboardSummary,
  DashboardTrend,
  ExpenseReport,
  Investment,
  InvestmentEntry,
  Period,
  CreditCard,
  CardAnalysis,
} from "./types";

export function fetchCreditCards(token: string) { return apiRequest<CreditCard[]>("/credit-cards", { token }); }
export function createCreditCard(token: string, payload: {issuer:string;name:string;last_four?:string;credit_limit?:number}) { return apiRequest<CreditCard>("/credit-cards", {method:"POST",body:JSON.stringify(payload),token}); }
export function fetchCardAnalysis(token: string, cardId?: string) { return apiRequest<CardAnalysis>(cardId ? `/credit-cards/${cardId}/analysis` : "/credit-cards/analysis", {token}); }
export function importCardStatement(token: string, cardId: string, file: File) { const body = new FormData(); body.append("statement", file); return apiRequest(`/credit-cards/${cardId}/statements/import`, {method:"POST",body,token}); }
export function importAndDetectCardStatement(token: string, file: File) { const body = new FormData(); body.append("statement", file); return apiRequest<{card:CreditCard;card_created:boolean;statement:{id:string};card_detection?:{confidence:number;needs_review:boolean;reason?:string|null}}>("/credit-cards/statements/import", {method:"POST",body,token}); }
export function updateCreditCard(token: string, cardId: string, payload: Partial<Pick<CreditCard,"issuer"|"name"|"last_four"|"credit_limit"|"billing_cycle_day"|"payment_due_day">>) { return apiRequest<CreditCard>(`/credit-cards/${cardId}`, {method:"PATCH",body:JSON.stringify(payload),token}); }
export function updateCardTransactionCategory(token: string, cardId: string, transactionId: string, category: string) { return apiRequest(`/credit-cards/${cardId}/transactions/${transactionId}`, {method:"PATCH",body:JSON.stringify({category}),token}); }

export function fetchAccounts(token: string) {
  return apiRequest<Account[]>("/accounts", { token });
}

export function createAccount(token: string, payload: CreateAccountPayload) {
  return apiRequest<Account>("/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export function addAccountEntry(token: string, accountId: string, payload: AddAccountEntryPayload) {
  return apiRequest<AccountEntry>(`/accounts/${accountId}/entries`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export function fetchInvestments(token: string) {
  return apiRequest<Investment[]>("/investments", { token });
}

export function createInvestment(token: string, payload: CreateInvestmentPayload) {
  return apiRequest<Investment>("/investments", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export function addInvestmentEntry(
  token: string,
  investmentId: string,
  payload: AddInvestmentEntryPayload,
) {
  return apiRequest<InvestmentEntry>(`/investments/${investmentId}/entries`, {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export function fetchDashboardSummary(token: string) {
  return apiRequest<DashboardSummary>("/dashboard/summary", { token });
}

export function fetchDashboardTrend(token: string, period: Period) {
  const bucketCount = period === "weekly" ? 8 : 6;
  return apiRequest<DashboardTrend>(`/dashboard/trends?period=${period}&bucket_count=${bucketCount}`, {
    token,
  });
}

export function fetchExpenseReports(token: string) {
  return apiRequest<ExpenseReport[]>("/expenses/reports", { token });
}

export function importExpenseStatement(token: string, file: File) {
  const body = new FormData();
  body.append("statement", file);

  return apiRequest<ExpenseReport>("/expenses/import", {
    method: "POST",
    body,
    token,
  });
}
