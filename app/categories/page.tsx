'use client';

import { FormEvent, useEffect, useState } from 'react';

interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  color: string;
  budget?: number;
  parentId?: string;
}

const PRESET_COLORS = [
  '#22c55e', '#3b82f6', '#f97316', '#a855f7',
  '#ec4899', '#eab308', '#14b8a6', '#ef4444',
  '#6366f1', '#64748b'
];

const TYPE_LABELS = { expense: 'Výdaj', income: 'Příjem' };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // formulář
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [budget, setBudget] = useState('');
  const [parentId, setParentId] = useState('');

  // inline editace
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editBudget, setEditBudget] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/categories');
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const body = {
      name,
      type,
      color,
      budget: budget ? Number(budget) : undefined,
      parentId: parentId || undefined
    };
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error ?? 'Chyba');
      return;
    }
    setName(''); setBudget(''); setParentId('');
    void load();
  };

  const startEdit = (c: Category) => {
    setEditId(c.id);
    setEditName(c.name);
    setEditColor(c.color);
    setEditBudget(c.budget ? String(c.budget) : '');
  };

  const handleSaveEdit = async (id: string) => {
    await fetch(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName,
        color: editColor,
        budget: editBudget ? Number(editBudget) : null
      })
    });
    setEditId(null);
    void load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu smazat kategorii? Transakce ji ztratí.')) return;
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    void load();
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');
  const parentOptions = categories.filter((c) => c.type === type && !c.parentId);

  const renderList = (list: Category[]) =>
    list.length === 0 ? (
      <p className="text-sm text-slate-500 px-1">Žádné kategorie</p>
    ) : (
      <div className="space-y-2">
        {list.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3"
          >
            {/* Barevný indikátor */}
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: c.color }}
            />

            {editId === c.id ? (
              /* Inline editace */
              <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
                <input
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 w-36"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Limit (Kč)"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 w-32"
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                />
                <div className="flex gap-1">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                        editColor === col ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ background: col }}
                      onClick={() => setEditColor(col)}
                    />
                  ))}
                </div>
                <button
                  onClick={() => handleSaveEdit(c.id)}
                  className="px-3 py-1 rounded-lg bg-emerald-600 text-xs hover:bg-emerald-500"
                >
                  Uložit
                </button>
                <button
                  onClick={() => setEditId(null)}
                  className="px-3 py-1 rounded-lg border border-slate-700 text-xs hover:border-slate-500"
                >
                  Zrušit
                </button>
              </div>
            ) : (
              /* Zobrazení */
              <>
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {c.name}
                    {c.parentId && (
                      <span className="ml-2 text-xs text-slate-500">podkategorie</span>
                    )}
                  </div>
                  {c.budget && (
                    <div className="text-xs text-slate-500">
                      Limit: {c.budget.toLocaleString('cs-CZ')} Kč/měs.
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(c)}
                    className="text-xs px-3 py-1 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-100 hover:border-slate-500 transition-colors"
                  >
                    Upravit
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs px-3 py-1 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Smazat
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-semibold">Kategorie</h2>

      {/* Formulář – přidat kategorii */}
      <form
        onSubmit={handleAdd}
        className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
      >
        <div className="text-sm font-semibold text-slate-300">Přidat kategorii</div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
            <label className="text-xs text-slate-400">Název</label>
            <input
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              placeholder="např. Jídlo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Typ</label>
            <select
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              value={type}
              onChange={(e) => setType(e.target.value as 'expense' | 'income')}
            >
              <option value="expense">Výdaj</option>
              <option value="income">Příjem</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Měs. limit (Kč, volitelné)</label>
            <input
              type="number"
              min="0"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              placeholder="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Nadřazená kat. (volitelné)</label>
            <select
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">– žádná –</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Výběr barvy */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-400">Barva</label>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                  color === col ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ background: col }}
                onClick={() => setColor(col)}
              />
            ))}
            <input
              type="color"
              className="w-7 h-7 rounded cursor-pointer bg-transparent border border-slate-700"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              title="Vlastní barva"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-sm font-medium hover:bg-emerald-500 transition-colors"
        >
          + Přidat kategorii
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-400">Načítám kategorie…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Výdajové kategorie */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <h3 className="text-sm font-semibold text-slate-300">
                Výdajové ({expenseCategories.length})
              </h3>
            </div>
            {renderList(expenseCategories)}
          </div>

          {/* Příjmové kategorie */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-300">
                Příjmové ({incomeCategories.length})
              </h3>
            </div>
            {renderList(incomeCategories)}
          </div>
        </div>
      )}

      {/* Nápověda */}
      {!loading && categories.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
          Žádné kategorie. Spusť{' '}
          <a href="/api/dev/seed" target="_blank" className="text-emerald-400 underline">
            seed
          </a>{' '}
          pro načtení demo dat nebo přidej kategorie ručně výše.
          <br />
          Kategorie se pak zobrazují jako dropdown při přidávání transakcí.
        </div>
      )}
    </div>
  );
}
