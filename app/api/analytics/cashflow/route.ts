import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';

const USER_ID = 'user-1';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  if (!month) {
    return NextResponse.json({ error: 'Chybí parametr month (YYYY-MM)' }, { status: 400 });
  }

  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const m = Number(monthStr);
  const startDate = `${year}-${String(m).padStart(2, '0')}-01`;
  const endDate =
    m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, '0')}-01`;

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account)<-[:FROM]-(t:Transaction)
      WHERE t.date >= date($startDate) AND t.date < date($endDate)
      OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
      RETURN
        t.type            AS type,
        t.description     AS description,
        t.amount          AS amount,
        t.date            AS date,
        a.id              AS accountId,
        a.name            AS accountName,
        c.name            AS categoryName
      ORDER BY t.date DESC
      `,
      { userId: USER_ID, startDate, endDate }
    );

    if (result.records.length === 0) {
      return NextResponse.json({
        month, income: [], expenses: [],
        totalIncome: 0, totalExpenses: 0,
        netCashflow: 0, savingsRate: 0,
        accountBalanceChange: { from: 0, to: 0 }
      });
    }

    const incomeMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const r of result.records) {
      const type = r.get('type') as string;
      const description = r.get('description') as string;
      const amount = Number(r.get('amount') ?? 0);
      const catName = (r.get('categoryName') as string | null) ?? 'Nezařazeno';

      if (type === 'income') {
        totalIncome += amount;
        incomeMap[description] = (incomeMap[description] ?? 0) + amount;
      } else if (type === 'expense') {
        totalExpenses += amount;
        expenseMap[catName] = (expenseMap[catName] ?? 0) + amount;
      }
    }

    const income = Object.entries(incomeMap)
      .map(([source, amount]) => ({ source, amount }))
      .sort((a, b) => b.amount - a.amount);

    const expenses = Object.entries(expenseMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    const netCashflow = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? netCashflow / totalIncome : 0;

    return NextResponse.json({
      month, income, expenses,
      totalIncome, totalExpenses,
      netCashflow, savingsRate,
      accountBalanceChange: { from: 0, to: netCashflow }
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při výpočtu cashflow' }, { status: 500 });
  } finally {
    await session.close();
  }
}
