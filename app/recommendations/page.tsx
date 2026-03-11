'use client';

import { useEffect, useState } from 'react';

interface SavingRec {
  title: string;
  suggestion: string;
  potentialSavings: number;
  priority: string;
}

interface InvestmentRec {
  asset: string;
  expectedReturn: number;
  risk: string;
  amountSuggestion: number;
  reason: string;
}

export default function RecommendationsPage() {
  const [savings, setSavings] = useState<SavingRec[]>([]);
  const [investment, setInvestment] = useState<InvestmentRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [sRes, iRes] = await Promise.all([
          fetch('/api/recommendations/savings'),
          fetch('/api/recommendations/investment')
        ]);
        if (!sRes.ok || !iRes.ok) throw new Error('Chyba při načítání doporučení');
        const sJson = await sRes.json();
        const iJson = await iRes.json();
        setSavings(Array.isArray(sJson.recommendations) ? sJson.recommendations : []);
        setInvestment(Array.isArray(iJson) ? iJson : []);
      } catch (e: any) {
        setError(e.message ?? 'Neznámá chyba');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Doporučení</h2>
      {loading ? (
        <p className="text-sm text-slate-400">Načítám doporučení…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <>
          <section className="space-y-3">
            <h3 className="font-medium">Úspory</h3>
            {savings.map((r) => (
              <div
                key={r.title}
                className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-sm"
              >
                <div className="flex justify-between mb-1">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-emerald-400">
                    Potenciální úspora: {r.potentialSavings.toFixed(0)} Kč
                  </div>
                </div>
                <div className="text-slate-300 mb-1">{r.suggestion}</div>
                <div className="text-xs text-slate-500">Priorita: {r.priority}</div>
              </div>
            ))}
            {savings.length === 0 && (
              <p className="text-sm text-slate-400">Nebyly nalezeny žádné tipy na úspory.</p>
            )}
          </section>
          <section className="space-y-3">
            <h3 className="font-medium">Investice</h3>
            {investment.map((r) => (
              <div
                key={r.asset}
                className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-sm"
              >
                <div className="flex justify-between mb-1">
                  <div className="font-medium">{r.asset}</div>
                  <div className="text-slate-400">
                    Očekávaný výnos: {(r.expectedReturn * 100).toFixed(1)} %
                  </div>
                </div>
                <div className="text-slate-300 mb-1">{r.reason}</div>
                <div className="text-xs text-slate-500">
                  Navrhovaná částka: {r.amountSuggestion.toFixed(0)} Kč (riziko {r.risk})
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

