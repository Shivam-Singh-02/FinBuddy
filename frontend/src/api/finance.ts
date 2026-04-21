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
  Investment,
  InvestmentEntry,
  Period,
} from "./types";

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

