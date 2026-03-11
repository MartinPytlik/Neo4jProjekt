/**
 * Neo4j vrací datum jako vlastní objekt { year, month, day } (nebo Integer wrappery).
 * Tato funkce ho převede na ISO string "YYYY-MM-DD".
 */
export function neoDateToStr(d: unknown): string {
  if (!d) return '';
  if (typeof d === 'string') return d;
  const obj = d as Record<string, unknown>;
  if (obj.year !== undefined) {
    const y = typeof obj.year === 'object' ? (obj.year as any).low : obj.year;
    const m = typeof obj.month === 'object' ? (obj.month as any).low : obj.month;
    const day = typeof obj.day === 'object' ? (obj.day as any).low : obj.day;
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return String(d);
}

/** Převede Neo4j Integer nebo number na number. */
export function neoNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (o.low !== undefined) return Number(o.low);
  }
  return Number(v);
}

/** Formátuje datum jako "DD. MM. YYYY" pro UI. */
export function formatDate(iso: string): string {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}. ${m}. ${y}`;
}
