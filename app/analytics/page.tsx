'use client';

import { useEffect, useState } from 'react';

interface IncomeRow { source: string; amount: number }
interface ExpenseRow { category: string; amount: number; percentage: number }
interface Cashflow {
  month: string;
  income: IncomeRow[];
  expenses: ExpenseRow[];
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
  savingsRate: number;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  const months = ['Led','Úno','Bře','Dub','Kvě','Čvn','Čvc','Srp','Zář','Říj','Lis','Pro'];
  return `${months[Number(m) - 1]} ${y}`;
}

function prevMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}
function nextMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}
function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function AnalyticsPage() {
  const [month, setMonth] = useState(currentYearMonth);
  const [cf, setCf] = useState<Cashflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/analytics/cashflow?month=${month}`);
      if (!res.ok) { setError('Chyba při načítání'); setLoading(false); return; }
      const data = await res.json();
      setCf(data);
      setLoading(false);
    };
    void load();
  }, [month]);

  const maxExpense = cf ? Math.max(...cf.expenses.map(e => e.amount), 1) : 1;
  const maxIncome = cf ? Math.max(...cf.income.map(i => i.amount), 1) : 1;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Hlavička + výběr měsíce */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-semibold">Cashflow</h2>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setMonth(prevMonth(month))}
            className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors"
          >‹</button>
          <input
            type="month"
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
            value={month}
            onChange={e => setMonth(e.target.value)}
          />
          <button
            onClick={() => setMonth(nextMonth(month))}
            className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors"
          >›</button>
          <button
            onClick={() => setMonth(currentYearMonth())}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs transition-colors"
          >Dnes</button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Načítám cashflow…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : !cf ? null : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-1">Příjmy</div>
              <div className="text-xl font-semibold text-emerald-400">
                {cf.totalIncome.toLocaleString('cs-CZ')} Kč
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-1">Výdaje</div>
              <div className="text-xl font-semibold text-red-400">
                {cf.totalExpenses.toLocaleString('cs-CZ')} Kč
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-1">Čisté cashflow</div>
              <div className={`text-xl font-semibold ${cf.netCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {cf.netCashflow >= 0 ? '+' : ''}{cf.netCashflow.toLocaleString('cs-CZ')} Kč
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-1">Míra úspor</div>
              <div className="text-xl font-semibold text-blue-400">
                {(cf.savingsRate * 100).toFixed(1)} %
              </div>
            </div>
          </div>

          {/* Vizuální porovnání příjmy vs výdaje */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-sm font-medium mb-4">Příjmy vs výdaje – {monthLabel(month)}</div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Příjmy</span>
                  <span className="text-emerald-400">{cf.totalIncome.toLocaleString('cs-CZ')} Kč</span>
                </div>
                <div className="h-5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Výdaje</span>
                  <span className="text-red-400">{cf.totalExpenses.toLocaleString('cs-CZ')} Kč</span>
                </div>
                <div className="h-5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${Math.min((cf.totalExpenses / Math.max(cf.totalIncome, 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Zdroje příjmů */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="text-sm font-medium mb-4">Zdroje příjmů</div>
              {cf.income.length === 0 ? (
                <p className="text-xs text-slate-500">Žádné příjmy v tomto měsíci.</p>
              ) : (
                <div className="space-y-3">
                  {cf.income.map(row => (
                    <div key={row.source}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">{row.source}</span>
                        <span className="text-emerald-400">{row.amount.toLocaleString('cs-CZ')} Kč</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${(row.amount / maxIncome) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Výdaje dle kategorie */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="text-sm font-medium mb-4">Výdaje dle kategorie</div>
              {cf.expenses.length === 0 ? (
                <p className="text-xs text-slate-500">Žádné výdaje v tomto měsíci.</p>
              ) : (
                <div className="space-y-3">
                  {cf.expenses.map(row => (
                    <div key={row.category}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">{row.category}</span>
                        <span className="text-slate-400">
                          {row.amount.toLocaleString('cs-CZ')} Kč
                          <span className="ml-1 text-slate-600">({row.percentage.toFixed(1)} %)</span>
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${(row.amount / maxExpense) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Prázdný stav */}
          {cf.totalIncome === 0 && cf.totalExpenses === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-sm text-slate-400 text-center">
              Pro měsíc <strong className="text-slate-200">{monthLabel(month)}</strong> nejsou žádné transakce.
              <br />
              <a href="/api/dev/seed" target="_blank" className="text-emerald-400 underline mt-2 inline-block">
                Spustit seed (načte demo data včetně aktuálního měsíce)
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
