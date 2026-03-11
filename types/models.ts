export type Currency = 'USD' | 'CZK' | 'EUR';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  currency: Currency;
}

export type AccountType = 'checking' | 'savings' | 'investment' | 'crypto';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  bank: string;
  createdAt: string;
}

export type CardType = 'credit' | 'debit';

export interface Card {
  id: string;
  name: string;
  type: CardType;
  lastDigits: string;
  limit?: number;
  linkedAccountId?: string;
}

export type CategoryType = 'expense' | 'income';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  budget?: number;
  parentId?: string;
}

export type TransactionType = 'expense' | 'income' | 'transfer';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: TransactionType;
  status: TransactionStatus;
  metadata?: Record<string, unknown>;
}

export interface Merchant {
  id: string;
  name: string;
  category: string;
  locationCity: string;
  locationCountry: string;
  avgTransactionSize: number;
}

export type GoalType = 'savings' | 'investment' | 'debt_payoff';
export type RiskProfile = 'low' | 'medium' | 'high';

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  riskProfile: RiskProfile;
}

export interface BudgetPlan {
  id: string;
  month: string;
  notes?: string;
}

