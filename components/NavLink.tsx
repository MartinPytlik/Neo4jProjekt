'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

export default function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive
          ? 'bg-emerald-600/20 text-emerald-400 font-medium'
          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
      }`}
    >
      {children}
    </Link>
  );
}
