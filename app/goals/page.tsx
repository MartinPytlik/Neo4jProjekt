'use client';

import { FormEvent, useEffect, useState } from 'react';

interface Goal {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  riskProfile: string;
  progress: number;
}

const TYPE_LABELS: Record<string, string> = {
  savings: 'Spoření',
  investment: 'Investice',
  debt_payoff: 'Splacení dluhu'
};

const TYPE_COLORS: Record<string, string> = {
  savings: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  investment: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  debt_payoff: 'border-amber-500/40 bg-amber-500/10 text-amber-400'
};

const RISK_LABELS: Record<string, string> = {
  low: 'Nízké',
  medium: 'Střední',
  high: 'Vysoké'
};

const RISK_COLORS: Record<string, string> = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-red-400'
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    type: 'savings',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    riskProfile: 'medium'
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/goals');
      if (!res.ok) throw new Error('Chyba při načítání cílů');
      const json = await res.json();
      setGoals(Array.isArray(json) ? json : []);
    } catch (e: any) {
      setError(e.message ?? 'Neznámá chyba');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const body = {
      name: form.name,
      type: form.type,
      targetAmount: Number(form.targetAmount) || 0,
      currentAmount: Number(form.currentAmount) || 0,
      deadline: form.deadline,
      riskProfile: form.riskProfile
    };
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? 'Chyba při vytváření cíle');
      return;
    }
    setForm({ name: '', type: 'savings', targetAmount: '', currentAmount: '', deadline: '', riskProfile: 'medium' });
    void load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu smazat cíl?')) return;
    const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? 'Chyba při mazání');
      return;
    }
    void load();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-semibold">Cíle</h2>

      {/* Formulář */}
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
      >
        <div className="text-sm font-semibold text-slate-300">Nový cíl</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
            <label className="text-xs text-slate-400">Název</label>
            <input
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              placeholder="např. Nové auto"
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
              <option value="savings">Spoření</option>
              <option value="investment">Investice</option>
              <option value="debt_payoff">Splacení dluhu</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Rizikový profil</label>
            <select
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              value={form.riskProfile}
              onChange={(e) => setForm((f) => ({ ...f, riskProfile: e.target.value }))}
            >
              <option value="low">Nízké riziko</option>
              <option value="medium">Střední riziko</option>
              <option value="high">Vysoké riziko</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Cílová částka (Kč)</label>
            <input
              type="number"
              min="0"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              placeholder="100 000"
              value={form.targetAmount}
              onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Aktuální částka (Kč)</label>
            <input
              type="number"
              min="0"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              placeholder="0"
              value={form.currentAmount}
              onChange={(e) => setForm((f) => ({ ...f, currentAmount: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Termín</label>
            <input
              type="date"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              required
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-sm font-medium hover:bg-emerald-500 transition-colors"
        >
          + Přidat cíl
        </button>
      </form>

      {/* Seznam cílů */}
      {loading ? (
        <p className="text-sm text-slate-400">Načítám cíle…</p>
      ) : goals.length === 0 ? (
        <p className="text-sm text-slate-400">
          Zatím žádné cíle. Přidej první pomocí formuláře výše nebo spusť{' '}
          <a href="/api/dev/seed" target="_blank" className="text-emerald-400 underline">
            seed
          </a>{' '}
          pro demo data.
        </p>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => (
            <div key={g.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="font-medium">{g.name}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        TYPE_COLORS[g.type] ?? 'border-slate-600 bg-slate-700 text-slate-300'
                      }`}
                    >
                      {TYPE_LABELS[g.type] ?? g.type}
                    </span>
                    <span className={`text-xs ${RISK_COLORS[g.riskProfile] ?? 'text-slate-400'}`}>
                      Riziko: {RISK_LABELS[g.riskProfile] ?? g.riskProfile}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {g.currentAmount.toLocaleString('cs-CZ')} Kč
                    </div>
                    <div className="text-xs text-slate-500">
                      z {g.targetAmount.toLocaleString('cs-CZ')} Kč
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="text-xs px-3 py-1 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Smazat
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      g.progress >= 1 ? 'bg-emerald-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(g.progress * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{Math.round(g.progress * 100)} % splněno</span>
                  <span>
                    Termín:{' '}
                    {g.deadline
                      ? new Date(g.deadline).toLocaleDateString('cs-CZ')
                      : '–'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
