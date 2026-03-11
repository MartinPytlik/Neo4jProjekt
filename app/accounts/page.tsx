'use client';

import { FormEvent, useEffect, useState } from 'react';

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  bank: string;
}

const TYPE_LABELS: Record<string, string> = {
  checking: 'Běžný',
  savings: 'Spořicí',
  investment: 'Investiční',
  crypto: 'Krypto'
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // formulář – přidat
  const [form, setForm] = useState({ name: '', type: 'checking', balance: '0', bank: '' });

  // inline editace
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editBank, setEditBank] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/accounts');
      if (!res.ok) throw new Error('Chyba při načítání účtů');
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message ?? 'Neznámá chyba');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        type: form.type,
        balance: Number(form.balance) || 0,
        bank: form.bank
      })
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error ?? 'Chyba');
      return;
    }
    setForm({ name: '', type: 'checking', balance: '0', bank: '' });
    void load();
  };

  const startEdit = (a: Account) => {
    setEditId(a.id);
    setEditName(a.name);
    setEditBalance(String(a.balance));
    setEditBank(a.bank);
  };

  const handleSaveEdit = async (id: string) => {
    const res = await fetch(`/api/accounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, balance: Number(editBalance), bank: editBank })
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error ?? 'Chyba při ukládání');
      return;
    }
    setEditId(null);
    void load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu smazat účet?')) return;
    setError('');
    const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error ?? 'Nelze smazat');
      return;
    }
    void load();
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-semibold">Účty</h2>

      {/* Formulář přidat */}
      <form
        onSubmit={handleAdd}
        className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
      >
        <div className="text-sm font-semibold text-slate-300">Přidat účet</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Název</label>
            <input
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              placeholder="Běžný účet"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
              <option value="checking">Běžný</option>
              <option value="savings">Spořicí</option>
              <option value="investment">Investiční</option>
              <option value="crypto">Krypto</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Počáteční zůstatek (Kč)</label>
            <input
              type="number"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              value={form.balance}
              onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Banka</label>
            <input
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              placeholder="Demo Banka"
              value={form.bank}
              onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))}
              required
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-sm font-medium hover:bg-emerald-500 transition-colors"
        >
          + Přidat účet
        </button>
      </form>

      {/* Seznam účtů */}
      {loading ? (
        <p className="text-sm text-slate-400">Načítám účty…</p>
      ) : (
        <div className="space-y-2">
          {accounts.map((a) =>
            editId === a.id ? (
              /* Inline editace */
              <div
                key={a.id}
                className="bg-slate-900 border border-emerald-600/40 rounded-xl px-4 py-3 space-y-3"
              >
                <div className="text-xs text-slate-400 font-medium">Upravit účet</div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <input
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 w-40"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Název"
                  />
                  <input
                    type="number"
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 w-36"
                    value={editBalance}
                    onChange={(e) => setEditBalance(e.target.value)}
                    placeholder="Zůstatek"
                  />
                  <input
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 w-36"
                    value={editBank}
                    onChange={(e) => setEditBank(e.target.value)}
                    placeholder="Banka"
                  />
                  <button
                    onClick={() => handleSaveEdit(a.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-xs hover:bg-emerald-500"
                  >
                    Uložit
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs hover:border-slate-500"
                  >
                    Zrušit
                  </button>
                </div>
              </div>
            ) : (
              /* Zobrazení */
              <div
                key={a.id}
                className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="text-xs text-slate-500">
                    {a.bank} · {TYPE_LABELS[a.type] ?? a.type}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold">
                    {a.balance.toLocaleString('cs-CZ')} Kč
                  </div>
                  <button
                    onClick={() => startEdit(a)}
                    className="text-xs px-3 py-1 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-100 hover:border-slate-500 transition-colors"
                  >
                    Upravit
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-xs px-3 py-1 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Smazat
                  </button>
                </div>
              </div>
            )
          )}
          {accounts.length === 0 && (
            <p className="text-sm text-slate-400">Žádné účty.</p>
          )}

          {/* Celkový zůstatek */}
          {accounts.length > 0 && (
            <div className="flex justify-between items-center border-t border-slate-800 pt-3 px-1 text-sm">
              <span className="text-slate-400">Celkový zůstatek</span>
              <span className="font-semibold">{totalBalance.toLocaleString('cs-CZ')} Kč</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
