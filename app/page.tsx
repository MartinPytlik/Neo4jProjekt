'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Cashflow {
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
  savingsRate: number;
  expenses: { category: string; amount: number; percentage: number }[];
}

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  progress: number;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  bank: string;
}

export default function DashboardPage() {
  const [cf, setCf] = useState<Cashflow | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const load = async () => {
      setLoading(true);
      const [cfRes, goalsRes, accRes] = await Promise.all([
        fetch(`/api/analytics/cashflow?month=${month}`),
        fetch('/api/goals'),
        fetch('/api/accounts')
      ]);
      const [cfData, goalsData, accData] = await Promise.all([
        cfRes.json(),
        goalsRes.json(),
        accRes.json()
      ]);
      setCf(cfData);
      setGoals(Array.isArray(goalsData) ? goalsData : []);
      setAccounts(Array.isArray(accData) ? accData : []);
      setLoading(false);
    };
    void load();
  }, []);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const nearestGoal = goals[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <a
          href="/api/dev/seed"
          target="_blank"
          className="text-xs text-slate-500 hover:text-emerald-400 border border-slate-800 px-3 py-1 rounded-lg"
        >
          Načíst demo data
        </a>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Načítám přehled…</p>
      ) : (
        <>
          {/* KPI karta */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-1">Příjmy (měsíc)</div>
              <div className="text-xl font-semibold text-emerald-400">
                {cf?.totalIncome ? cf.totalIncome.toLocaleString('cs-CZ') : '–'} Kč
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-1">Výdaje (měsíc)</div>
              <div className="text-xl font-semibold text-red-400">
                {cf?.totalExpenses ? cf.totalExpenses.toLocaleString('cs-CZ') : '–'} Kč
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-1">Čisté cashflow</div>
              <div
                className={`text-xl font-semibold ${
                  (cf?.netCashflow ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {cf?.netCashflow != null ? cf.netCashflow.toLocaleString('cs-CZ') : '–'} Kč
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-1">Míra úspor</div>
              <div className="text-xl font-semibold text-blue-400">
                {cf?.savingsRate != null ? (cf.savingsRate * 100).toFixed(1) : '–'} %
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Účty */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Účty</h3>
                <Link href="/accounts" className="text-xs text-emerald-400 hover:underline">
                  Spravovat →
                </Link>
              </div>
              {accounts.length === 0 ? (
                <p className="text-xs text-slate-500">Žádné účty</p>
              ) : (
                <>
                  {accounts.slice(0, 3).map((a) => (
                    <div key={a.id} className="flex justify-between text-sm">
                      <span className="text-slate-300">{a.name}</span>
                      <span className="font-medium">{a.balance.toLocaleString('cs-CZ')} Kč</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-800 pt-2 flex justify-between text-sm">
                    <span className="text-slate-400">Celkem</span>
                    <span className="font-semibold">{totalBalance.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                </>
              )}
            </div>

            {/* Top výdaje */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Top výdaje (měsíc)</h3>
                <Link href="/analytics/spending" className="text-xs text-emerald-400 hover:underline">
                  Detail →
                </Link>
              </div>
              {!cf || cf.expenses.length === 0 ? (
                <p className="text-xs text-slate-500">Žádné výdaje</p>
              ) : (
                cf.expenses.slice(0, 4).map((e) => (
                  <div key={e.category} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{e.category}</span>
                      <span>{e.amount.toLocaleString('cs-CZ')} Kč</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${Math.min(e.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Nejbližší cíl */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Nejbližší cíl</h3>
                <Link href="/goals" className="text-xs text-emerald-400 hover:underline">
                  Všechny cíle →
                </Link>
              </div>
              {!nearestGoal ? (
                <p className="text-xs text-slate-500">Žádné cíle</p>
              ) : (
                <>
                  <div className="font-medium">{nearestGoal.name}</div>
                  <div className="text-xs text-slate-400">
                    {nearestGoal.currentAmount.toLocaleString('cs-CZ')} /{' '}
                    {nearestGoal.targetAmount.toLocaleString('cs-CZ')} Kč
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(nearestGoal.progress * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-400">
                    {Math.round(nearestGoal.progress * 100)} % splněno · deadline{' '}
                    {nearestGoal.deadline
                      ? new Date(nearestGoal.deadline).toLocaleDateString('cs-CZ')
                      : '-'}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Rychlé akce */}
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/transactions"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-medium transition-colors"
            >
              + Nová transakce
            </Link>
            <Link
              href="/goals"
              className="px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
            >
              + Nový cíl
            </Link>
            <Link
              href="/budget"
              className="px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
            >
              Nastavit rozpočet
            </Link>
            <Link
              href="/recommendations"
              className="px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
            >
              Doporučení
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
