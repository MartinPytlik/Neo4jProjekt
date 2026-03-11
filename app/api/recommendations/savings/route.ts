export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';

const USER_ID = 'user-1';

export async function GET() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account)<-[:FROM]-(t:Transaction {type: "expense"})
      OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
      OPTIONAL MATCH (t)-[:SPENT_AT]->(m:Merchant)
      WHERE t.date >= date() - duration({ months: 3 })
      RETURN t, c, m
      `,
      { userId: USER_ID }
    );

    const rows = result.records.map((r) => {
      const t = r.get('t').properties;
      const c = r.get('c')?.properties;
      const m = r.get('m')?.properties;
      return {
        amount: Number(t.amount),
        category: c?.name ?? 'Nezařazeno',
        merchant: m?.name
      };
    });

    // jednoduché heuristiky: streaming, kavárny, pojištění podle názvu merchant/category
    const streaming = rows.filter((r) =>
      (r.merchant ?? '').toLowerCase().match(/netflix|hbo|disney|spotify|apple music/)
    );
    const cafes = rows.filter((r) =>
      (r.merchant ?? '').toLowerCase().match(/café|coffee|starbucks|costa|kavárna/)
    );
    const insurance = rows.filter((r) =>
      (r.category ?? '').toLowerCase().includes('pojiště')
    );

    const recommendations: any[] = [];

    if (streaming.length > 0) {
      const byService: Record<string, number> = {};
      for (const s of streaming) {
        const name = s.merchant ?? 'Streaming služba';
        byService[name] = (byService[name] ?? 0) + s.amount;
      }
      const services = Object.entries(byService).map(([name, amount]) => ({
        name,
        amount
      }));
      const currentSpending = services.reduce((s, x) => s + x.amount, 0);
      const potentialSavings =
        services.length > 1
          ? currentSpending - services.sort((a, b) => b.amount - a.amount)[0].amount
          : 0;

      recommendations.push({
        title: 'Streaming služby',
        currentSpending,
        services,
        suggestion:
          'Zvaž sloučení nebo zrušení méně využívaných služeb, můžeš ušetřit značnou částku.',
        potentialSavings,
        priority: 'medium'
      });
    }

    if (cafes.length > 0) {
      const currentSpending = cafes.reduce((s, x) => s + x.amount, 0);
      const avgPrice =
        cafes.length > 0 ? currentSpending / cafes.length : 0;
      const potentialSavings = currentSpending * 0.6;

      recommendations.push({
        title: 'Kavárny',
        currentSpending,
        frequency: 'často',
        averagePrice: avgPrice,
        suggestion:
          'Část nákupů v kavárnách nahraď domácí kávou – rozdíl v měsíčních nákladech bude výrazný.',
        potentialSavings,
        priority: 'high'
      });
    }

    if (insurance.length > 0) {
      const currentSpending = insurance.reduce((s, x) => s + x.amount, 0);
      const potentialSavings = currentSpending * 0.1;

      recommendations.push({
        title: 'Pojištění',
        currentSpending,
        suggestion:
          'Porovnej svoji pojistku s jinými nabídkami – často lze ušetřit 5–15 % bez snížení krytí.',
        potentialSavings,
        priority: 'low'
      });
    }

    const totalPotentialSavings = recommendations.reduce(
      (s, r) => s + (r.potentialSavings ?? 0),
      0
    );

    return NextResponse.json({ recommendations, totalPotentialSavings });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při generování doporučení úspor' }, { status: 500 });
  } finally {
    await session.close();
  }
}

