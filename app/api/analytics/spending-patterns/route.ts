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
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account)<-[:FROM]-(t:Transaction {type: "expense"})
      WHERE t.date >= date() - duration({ months: $months })
      RETURN t.date AS date, toFloat(t.amount) AS amount
      `,
      { userId: USER_ID, months }
    );

    // heatmap podle dne v týdnu a týdne v měsíci (zjednodušeno)
    const heatmap: Record<string, number> = {};

    for (const r of result.records) {
      const d: Date = r.get('date');
      const amount = Number(r.get('amount'));
      const day = d.getDay(); // 0-6
      const week = Math.ceil(d.getDate() / 7); // 1-5
      const key = `${day}-${week}`;
      heatmap[key] = (heatmap[key] ?? 0) + amount;
    }

    const rows = Object.entries(heatmap).map(([key, amount]) => {
      const [day, week] = key.split('-').map((x) => Number(x));
      return { day, week, amount };
    });

    return NextResponse.json({ months, heatmap: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při výpočtu spending-patterns' }, { status: 500 });
  } finally {
    await session.close();
  }
}

