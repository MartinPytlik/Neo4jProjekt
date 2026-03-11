export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';

const USER_ID = 'user-1';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get('year');
  const year = Number(yearParam ?? new Date().getFullYear());

  const driver = getNeo4jDriver();
  const session = driver.session();

  const startDate = `${year}-01-01`;
  const endDate = `${year + 1}-01-01`;

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account)<-[:FROM]-(t:Transaction)
      WHERE t.date >= date($startDate) AND t.date < date($endDate)
      OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
      RETURN t, c
      `,
      { userId: USER_ID, startDate, endDate }
    );

    const expensesByCategory: Record<string, number> = {};
    const incomes: any[] = [];
    const goalsProgress: any[] = [];

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const r of result.records) {
      const t = r.get('t').properties;
      const c = r.get('c')?.properties;
      const amount = Number(t.amount);

      if (t.type === 'income') {
        totalIncome += amount;
        incomes.push(t);
      } else if (t.type === 'expense') {
        totalExpenses += amount;
        const name = c?.name ?? 'Nezařazeno';
        expensesByCategory[name] = (expensesByCategory[name] ?? 0) + amount;
      }
    }

    const topExpenses = Object.entries(expensesByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return NextResponse.json({
      year,
      totalIncome,
      totalExpenses,
      netCashflow: totalIncome - totalExpenses,
      topExpenses,
      goals: goalsProgress
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při výpočtu year-in-review' }, { status: 500 });
  } finally {
    await session.close();
  }
}

