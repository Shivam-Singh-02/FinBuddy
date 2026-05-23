export type Period = "weekly" | "monthly";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface AccountEntry {
  id: string;
  balance: number;
  as_of_date: string;
  created_at: string;
}

export interface Account {
  id: string;
  institution_name: string;
  account_name: string;
  account_type: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  latest_balance?: number | null;
  latest_balance_date?: string | null;
  recent_entries: AccountEntry[];
}

export interface InvestmentEntry {
  id: string;
  invested_amount: number;
  current_value: number;
  as_of_date: string;
  created_at: string;
}

export interface Investment {
  id: string;
  name: string;
  category: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  latest_invested_amount?: number | null;
  latest_current_value?: number | null;
  latest_valuation_date?: string | null;
  recent_entries: InvestmentEntry[];
}

export interface DashboardSummary {
  cash_total: number;
  investment_current_total: number;
  investment_principal_total: number;
  vlti_current_total: number;
  vlti_principal_total: number;
  net_worth: number;
  gain_loss: number;
  allocation: Array<{ label: string; value: number }>;
}

export interface TrendPoint {
  label: string;
  bucket_start: string;
  bucket_end: string;
  cash_total: number;
  investment_current_total: number;
  investment_principal_total: number;
  vlti_current_total: number;
  vlti_principal_total: number;
  net_worth: number;
}

export interface DashboardTrend {
  period: Period;
  points: TrendPoint[];
}

export interface ExpenseTransaction {
  transaction_date: string;
  description: string;
  merchant?: string | null;
  category: string;
  amount: number;
  currency: string;
  account_name?: string | null;
  confidence: number;
}

export interface ExpenseCategorySummary {
  category: string;
  total: number;
  transaction_count: number;
}

export interface ExpenseReport {
  id: string;
  source_filename: string;
  parser: "bedrock" | "openai" | "heuristic";
  statement_period_start?: string | null;
  statement_period_end?: string | null;
  total_spend: number;
  currency: string;
  category_totals: ExpenseCategorySummary[];
  transactions: ExpenseTransaction[];
  created_at: string;
}

export interface CreateAccountPayload {
  institution_name: string;
  account_name: string;
  account_type: string;
  notes?: string;
  initial_balance: number;
  balance_date: string;
}

export interface AddAccountEntryPayload {
  balance: number;
  as_of_date: string;
}

export interface CreateInvestmentPayload {
  name: string;
  category: string;
  notes?: string;
  initial_invested_amount: number;
  initial_current_value: number;
  valuation_date: string;
}

export interface AddInvestmentEntryPayload {
  invested_amount: number;
  current_value: number;
  as_of_date: string;
}
