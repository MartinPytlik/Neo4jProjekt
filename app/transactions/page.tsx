'use client';

import { FormEvent, useEffect, useState } from 'react';

interface TransactionRow {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: string;
  status: string;
  accountFromId: string;
  accountName?: string;
  categoryId?: string;
  categoryName?: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

const TYPE_LABELS: Record<string, string> = {
  expense: 'Výdaj',
  income: 'Příjem',
  transfer: 'Převod'
};

const TYPE_COLORS: Record<string, string> = {
  expense: 'text-red-400',
  income: 'text-emerald-400',
  transfer: 'text-blue-400'
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    description: '',
    type: 'expense',
    accountFromId: '',
    categoryId: ''
  });

  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (filterCategory) params.set('category', filterCategory);

      const [txRes, accRes, catRes] = await Promise.all([
        fetch(`/api/transactions?${params}`),
        fetch('/api/accounts'),
        fetch('/api/categories')
      ]);

      if (!txRes.ok) throw new Error('Chyba při načítání transakcí');
      const [txData, accData, catData] = await Promise.all([
        txRes.json(),
        accRes.json(),
        catRes.json()
      ]);

      setTransactions(Array.isArray(txData) ? txData : []);
      setAccounts(Array.isArray(accData) ? accData : []);
      setCategories(Array.isArray(catData) ? catData : []);

      if (accData.length > 0 && !form.accountFromId) {
        setForm((f) => ({ ...f, accountFromId: accData[0].id }));
      }
    } catch (e: any) {
      setError(e.message ?? 'Neznámá chyba');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterCategory]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.accountFromId) return;

    const body = {
      date: form.date,
      amount: Number(form.amount),
      description: form.description,
      type: form.type,
      status: 'completed',
      accountFromId: form.accountFromId,
      categoryId: form.categoryId || undefined
    };

    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error ?? 'Chyba při ukládání');
      return;
    }

    setForm((f) => ({ ...f, amount: '', description: '', categoryId: '' }));
    void loadAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu smazat transakci?')) return;
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? 'Chyba při mazání transakce');
      return;
    }
    void loadAll();
  };

  const expCategories = categories.filter((c) => c.type === 'expense');
  const incCategories = categories.filter((c) => c.type === 'income');

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">Transakce</h2>

      {/* Formulář pro přidání */}
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
      >
        <div className="text-sm font-semibold text-slate-300">Přidat transakci</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Datum</label>
            <input
              type="date"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Částka (Kč)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              placeholder="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
            />
          </div>
          <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
            <label className="text-xs text-slate-400">Popis</label>
            <input
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              placeholder="Popis transakce"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Typ</label>
            <select
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="expense">Výdaj</option>
              <option value="income">Příjem</option>
              <option value="transfer">Převod</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Účet</label>
            <select
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              value={form.accountFromId}
              onChange={(e) => setForm((f) => ({ ...f, accountFromId: e.target.value }))}
              required
            >
              <option value="">– vyberte účet –</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Kategorie (volitelné)</label>
            <select
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">– bez kategorie –</option>
              {form.type === 'expense'
                ? expCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                : incCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
            </select>
          </div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-sm font-medium hover:bg-emerald-500 transition-colors"
        >
          + Přidat transakci
        </button>
      </form>

      {/* Filtry */}
      <div className="flex flex-wrap gap-3 text-sm">
        <select
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Všechny typy</option>
          <option value="expense">Výdaje</option>
          <option value="income">Příjmy</option>
          <option value="transfer">Převody</option>
        </select>
        <select
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">Všechny kategorie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tabulka */}
      {loading ? (
        <p className="text-sm text-slate-400">Načítám transakce…</p>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-slate-400">
          Žádné transakce. Spusť seed na{' '}
          <a href="/api/dev/seed" className="text-emerald-400 underline" target="_blank">
            /api/dev/seed
          </a>{' '}
          nebo přidej první transakci výše.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Datum</th>
                <th className="px-4 py-3 text-left">Popis</th>
                <th className="px-4 py-3 text-left">Účet</th>
                <th className="px-4 py-3 text-left">Kategorie</th>
                <th className="px-4 py-3 text-center">Typ</th>
                <th className="px-4 py-3 text-right">Částka</th>
                <th className="px-4 py-3 text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-900/60 transition-colors">
                  <td className="px-4 py-3 text-slate-300">
                    {t.date ? new Date(t.date).toLocaleDateString('cs-CZ') : '-'}
                  </td>
                  <td className="px-4 py-3">{t.description}</td>
                  <td className="px-4 py-3 text-slate-400">{t.accountName ?? t.accountFromId}</td>
                  <td className="px-4 py-3 text-slate-400">{t.categoryName ?? '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        t.type === 'expense'
                          ? 'border-red-500/40 bg-red-500/10 text-red-400'
                          : t.type === 'income'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {TYPE_LABELS[t.type] ?? t.type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${TYPE_COLORS[t.type]}`}>
                    {t.type === 'expense' ? '−' : t.type === 'income' ? '+' : ''}
                    {t.amount.toLocaleString('cs-CZ')} Kč
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-xs px-3 py-1 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Smazat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
