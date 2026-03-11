import './globals.css';
import type { ReactNode } from 'react';
import NavLink from '@components/NavLink';

export const metadata = {
  title: 'Personal Finance Network',
  description: 'Správa osobních financí a investic'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body className="bg-slate-950 text-slate-50 antialiased">
        <div className="min-h-screen flex">
          {/* Sidebar */}
          <aside className="w-56 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col p-4 gap-1">
            <div className="mb-4 px-2">
              <div className="text-lg font-semibold leading-tight">Personal Finance</div>
              <div className="text-xs text-slate-500">Network</div>
            </div>
            <nav className="flex flex-col gap-0.5 text-sm">
              <NavLink href="/">Dashboard</NavLink>
              <NavLink href="/accounts">Účty</NavLink>
              <NavLink href="/transactions">Transakce</NavLink>
              <div className="text-xs text-slate-600 px-3 pt-3 pb-1 uppercase tracking-wider">
                Analýzy
              </div>
              <NavLink href="/analytics">Cashflow</NavLink>
              <NavLink href="/analytics/spending">Výdaje</NavLink>
              <div className="text-xs text-slate-600 px-3 pt-3 pb-1 uppercase tracking-wider">
                Správa
              </div>
              <NavLink href="/categories">Kategorie</NavLink>
              <NavLink href="/budget">Rozpočet</NavLink>
              <NavLink href="/goals">Cíle</NavLink>
              <NavLink href="/recommendations">Doporučení</NavLink>
            </nav>
          </aside>

          {/* Obsah */}
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
