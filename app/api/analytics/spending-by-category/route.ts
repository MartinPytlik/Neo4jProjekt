import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';

const USER_ID = 'user-1';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const monthsParam = searchParams.get('months') ?? '6';
  const months = Number(monthsParam);

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // WHERE před OPTIONAL MATCH, datum extrahujeme přímo v Cypheru jako rok+měsíc
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account)<-[:FROM]-(t:Transaction)
      WHERE t.type = "expense"
        AND t.date >= date() - duration({ months: $months })
      OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
      RETURN
        coalesce(c.id, "uncategorized")     AS catId,
        coalesce(c.name, "Nezařazeno")      AS catName,
        coalesce(c.color, "#64748b")        AS catColor,
        t.date.year                          AS year,
        t.date.month                         AS month,
        sum(toFloat(t.amount))               AS total
      ORDER BY year, month
      `,
      { userId: USER_ID, months }
    );

    // Sestavíme strukturu { catId -> { name, color, months: { "YYYY-MM": total } } }
    type CatData = { name: string; color: string; byMonth: Record<string, number> };
    const cats: Record<string, CatData> = {};

    const now = new Date();
    // generujeme seznam posledních N měsíců jako klíče YYYY-MM
    const monthKeys: string[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    for (const r of result.records) {
      const catId = r.get('catId') as string;
      const catName = r.get('catName') as string;
      const catColor = r.get('catColor') as string;
      const yearRaw = r.get('year');
      const monthRaw = r.get('month');
      const total = Number(r.get('total') ?? 0);

      // Neo4j vrací integer jako { low, high } nebo number
      const y = typeof yearRaw === 'object' ? (yearRaw as any).low : Number(yearRaw);
      const m = typeof monthRaw === 'object' ? (monthRaw as any).low : Number(monthRaw);
      const key = `${y}-${String(m).padStart(2, '0')}`;

      if (!cats[catId]) {
        cats[catId] = { name: catName, color: catColor, byMonth: {} };
      }
      cats[catId].byMonth[key] = (cats[catId].byMonth[key] ?? 0) + total;
    }

    // Přepočítáme na pole s hodnotami pro každý měsíc
    const currentMonthKey = monthKeys[monthKeys.length - 1];
    const prevMonthKey = monthKeys[monthKeys.length - 2] ?? null;

    const rows = Object.entries(cats).map(([id, c]) => {
      const thisMonth = c.byMonth[currentMonthKey] ?? 0;
      const lastMonth = prevMonthKey ? (c.byMonth[prevMonthKey] ?? 0) : 0;
      const trend = lastMonth === 0 ? null : (thisMonth - lastMonth) / lastMonth;
      const totalAll = Object.values(c.byMonth).reduce((s, v) => s + v, 0);

      return {
        id,
        category: c.name,
        color: c.color,
        thisMonth,
        lastMonth,
        trend,
        totalAll,
        byMonth: monthKeys.map((k) => ({ month: k, amount: c.byMonth[k] ?? 0 }))
      };
    });

    rows.sort((a, b) => b.thisMonth - a.thisMonth);

    return NextResponse.json({ months: monthKeys, categories: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Chyba při výpočtu spending-by-category' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
