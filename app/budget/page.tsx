'use client';

import { FormEvent, useEffect, useState } from 'react';

interface Budget {
  id: string;
  month: string;
  notes?: string;
  adherence: number;
}

interface BudgetRow {
  categoryId: string;
  category: string;
  planned: number;
  actual: number;
  remaining: number;
  percentageUsed: number;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [month, setMonth] = useState('');
  const [notes, setNotes] = useState('');
  const [catBudgets, setCatBudgets] = useState<{ categoryId: string; amount: string }[]>([
    { categoryId: '', amount: '' }
  ]);

  const loadBudgets = async () => {
    setLoadingList(true);
    const [bRes, cRes] = await Promise.all([fetch('/api/budgets'), fetch('/api/categories')]);
    const bData = await bRes.json();
    const cData = await cRes.json();
    setBudgets(Array.isArray(bData) ? bData : []);
    setCategories(Array.isArray(cData) ? cData : []);
    if (Array.isArray(bData) && bData.length > 0 && !selectedBudgetId) {
      setSelectedBudgetId(bData[0].id);
    }
    setLoadingList(false);
  };

  const loadDetail = async (id: string) => {
    if (!id) return;
    setLoadingDetail(true);
    const res = await fetch(`/api/budgets/${id}/vs-actual`);
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    setLoadingDetail(false);
  };

  useEffect(() => {
    void loadBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedBudgetId) void loadDetail(selectedBudgetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBudgetId]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const body = {
      month,
      notes: notes || undefined,
      categories: catBudgets
        .filter((c) => c.categoryId && c.amount)
        .map((c) => ({ categoryId: c.categoryId, budgetAmount: Number(c.amount) }))
    };
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    setMonth('');
    setNotes('');
    setCatBudgets([{ categoryId: '', amount: '' }]);
    await loadBudgets();
    if (data.id) setSelectedBudgetId(data.id);
  };

  const expCategories = categories.filter((c) => c.type === 'expense');

  const totalPlanned = rows.reduce((s, r) => s + r.planned, 0);
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Rozpočet</h2>

      {/* Výběr existujícího rozpočtu */}
      {!loadingList && budgets.length > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <label className="text-slate-400">Zobrazit rozpočet:</label>
          <select
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"
            value={selectedBudgetId}
            onChange={(e) => setSelectedBudgetId(e.target.value)}
          >
            {budgets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.month} {b.notes ? `(${b.notes})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Detail vybraného rozpočtu */}
      {loadingDetail ? (
        <p className="text-sm text-slate-400">Načítám rozpočet…</p>
      ) : selectedBudgetId && rows.length > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs mb-1">Plánováno</div>
              <div className="text-xl font-semibold">{totalPlanned.toLocaleString('cs-CZ')} Kč</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs mb-1">Skutečně utraceno</div>
              <div className="text-xl font-semibold">{totalActual.toLocaleString('cs-CZ')} Kč</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs mb-1">Zbývá</div>
              <div
                className={`text-xl font-semibold ${
                  totalPlanned - totalActual >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {(totalPlanned - totalActual).toLocaleString('cs-CZ')} Kč
              </div>
            </div>
          </div>
          {rows.map((r) => (
            <div
              key={r.categoryId}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4"
            >
              <div className="flex justify-between text-sm mb-2">
                <div className="font-medium">{r.category}</div>
                <div className="text-slate-400">
                  {r.actual.toFixed(0)} / {r.planned.toFixed(0)} Kč
                  <span
                    className={`ml-2 text-xs ${
                      r.percentageUsed > 1
                        ? 'text-red-400'
                        : r.percentageUsed > 0.8
                        ? 'text-amber-400'
                        : 'text-slate-500'
                    }`}
                  >
                    ({Math.round(r.percentageUsed * 100)} %)
                  </span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    r.percentageUsed < 0.8
                      ? 'bg-emerald-500'
                      : r.percentageUsed < 1
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(r.percentageUsed * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : selectedBudgetId ? (
        <p className="text-sm text-slate-400">Pro tento rozpočet nejsou žádná data.</p>
      ) : null}

      {/* Formulář pro nový rozpočet */}
      <form
        onSubmit={handleCreate}
        className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
      >
        <div className="text-sm font-semibold text-slate-300">Vytvořit nový rozpočet</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Měsíc</label>
            <input
              type="month"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Poznámka (volitelné)</label>
            <input
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              placeholder="Poznámka"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-slate-400">Limity kategorií (volitelné)</div>
          {catBudgets.map((cb, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <select
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2"
                value={cb.categoryId}
                onChange={(e) => {
                  const next = [...catBudgets];
                  next[i].categoryId = e.target.value;
                  setCatBudgets(next);
                }}
              >
                <option value="">– kategorie –</option>
                {expCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="w-36 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2"
                placeholder="Limit (Kč)"
                value={cb.amount}
                onChange={(e) => {
                  const next = [...catBudgets];
                  next[i].amount = e.target.value;
                  setCatBudgets(next);
                }}
              />
              {catBudgets.length > 1 && (
                <button
                  type="button"
                  className="text-red-400 text-xs px-2 hover:text-red-300"
                  onClick={() => setCatBudgets(catBudgets.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="text-xs text-emerald-400 hover:text-emerald-300"
            onClick={() => setCatBudgets([...catBudgets, { categoryId: '', amount: '' }])}
          >
            + Přidat kategorii
          </button>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-sm font-medium hover:bg-emerald-500 transition-colors"
        >
          Vytvořit rozpočet
        </button>
      </form>
    </div>
  );
}
