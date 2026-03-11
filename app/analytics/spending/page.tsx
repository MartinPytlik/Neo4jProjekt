'use client';

import { useEffect, useState } from 'react';

interface MonthAmount { month: string; amount: number }
interface CategoryRow {
  id: string;
  category: string;
  color: string;
  thisMonth: number;
  lastMonth: number;
  trend: number | null;
  totalAll: number;
  byMonth: MonthAmount[];
}
interface ApiResponse {
  months: string[];
  categories: CategoryRow[];
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  const labels = ['Led','Úno','Bře','Dub','Kvě','Čvn','Čvc','Srp','Zář','Říj','Lis','Pro'];
  return `${labels[Number(m) - 1]} ${y}`;
}

export default function SpendingAnalyticsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState('6');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/analytics/spending-by-category?months=${months}`);
      if (!res.ok) { setError('Chyba při načítání'); setLoading(false); return; }
      const json = await res.json();
      setData(json);
      setLoading(false);
    };
    void load();
  }, [months]);

  const totalThisMonth = data?.categories.reduce((s, c) => s + c.thisMonth, 0) ?? 0;
  const currentMonthLabel = data?.months ? monthLabel(data.months[data.months.length - 1]) : '';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-semibold">Analýza výdajů</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Zobrazit posledních</span>
          {['3','6','12'].map(n => (
            <button
              key={n}
              onClick={() => setMonths(n)}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                months === n
                  ? 'border-emerald-500 bg-emerald-600/20 text-emerald-400'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              {n} měs.
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Načítám data…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : !data || data.categories.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-sm text-slate-400 text-center">
          Žádné výdaje v posledních {months} měsících.
          <br />
          <a href="/api/dev/seed" target="_blank" className="text-emerald-400 underline mt-2 inline-block">
            Spustit seed
          </a>
        </div>
      ) : (
        <>
          {/* Aktuální měsíc – kategorie s progress bary */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-sm font-medium mb-1">
              Výdaje dle kategorie – <span className="text-slate-300">{currentMonthLabel}</span>
            </div>
            <div className="text-xs text-slate-500 mb-4">
              Celkem: {totalThisMonth.toLocaleString('cs-CZ')} Kč
            </div>
            <div className="space-y-3">
              {data.categories.map(row => (
                <div key={row.id}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: row.color }} />
                      <span>{row.category}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-300 font-medium">
                        {row.thisMonth.toLocaleString('cs-CZ')} Kč
                      </span>
                      {row.trend !== null && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          row.trend > 0.05
                            ? 'bg-red-500/15 text-red-400'
                            : row.trend < -0.05
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-slate-700 text-slate-400'
                        }`}>
                          {row.trend > 0 ? '▲' : '▼'} {Math.abs(row.trend * 100).toFixed(0)} %
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: totalThisMonth > 0
                          ? `${(row.thisMonth / totalThisMonth) * 100}%`
                          : '0%',
                        background: row.color
                      }}
                    />
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Minulý měsíc: {row.lastMonth.toLocaleString('cs-CZ')} Kč
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trend tabulka po měsících */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 overflow-x-auto">
            <div className="text-sm font-medium mb-4">Trend po měsících</div>
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-slate-500">
                  <th className="text-left pr-4 pb-2 font-normal">Kategorie</th>
                  {data.months.map(m => (
                    <th key={m} className="text-right pb-2 px-2 font-normal whitespace-nowrap">
                      {monthLabel(m)}
                    </th>
                  ))}
                  <th className="text-right pb-2 pl-4 font-normal">Celkem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.categories.map(row => (
                  <tr key={row.id} className="hover:bg-slate-800/40">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                        <span className="text-slate-300">{row.category}</span>
                      </div>
                    </td>
                    {row.byMonth.map(bm => (
                      <td key={bm.month} className="py-2 px-2 text-right text-slate-400">
                        {bm.amount > 0 ? bm.amount.toLocaleString('cs-CZ') : '–'}
                      </td>
                    ))}
                    <td className="py-2 pl-4 text-right font-medium text-slate-300">
                      {row.totalAll.toLocaleString('cs-CZ')}
                    </td>
                  </tr>
                ))}
                {/* Součtový řádek */}
                <tr className="border-t border-slate-700">
                  <td className="py-2 pr-4 text-slate-400 font-medium">Celkem</td>
                  {data.months.map(mk => {
                    const total = data.categories.reduce(
                      (s, c) => s + (c.byMonth.find(b => b.month === mk)?.amount ?? 0), 0
                    );
                    return (
                      <td key={mk} className="py-2 px-2 text-right font-medium text-slate-300">
                        {total > 0 ? total.toLocaleString('cs-CZ') : '–'}
                      </td>
                    );
                  })}
                  <td className="py-2 pl-4 text-right font-bold text-slate-200">
                    {data.categories.reduce((s, c) => s + c.totalAll, 0).toLocaleString('cs-CZ')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
