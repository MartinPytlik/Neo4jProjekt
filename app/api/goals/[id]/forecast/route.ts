import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';

const USER_ID = 'user-1';

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:CONTRIBUTES_TO]->(g:Goal {id: $goalId})
      OPTIONAL MATCH (t:Transaction)-[:CONTRIBUTES_TO]->(g)
      WHERE t.date >= date() - duration({ months: 3 })
      RETURN g, collect(t) AS txs
      `,
      { userId: USER_ID, goalId: params.id }
    );

    if (result.records.length === 0) {
      return NextResponse.json({ error: 'Cíl nenalezen' }, { status: 404 });
    }

    const rec = result.records[0];
    const g = rec.get('g').properties;
    const txs = (rec.get('txs') as any[]).filter(Boolean);

    const target = Number(g.targetAmount);
    const current = Number(g.currentAmount ?? 0);
    const remaining = Math.max(target - current, 0);

    const totalContributionLast3 = txs.reduce(
      (sum, t: any) => sum + Number(t.properties.amount ?? 0),
      0
    );
    const avgMonthly =
      txs.length === 0 ? 0 : totalContributionLast3 / 3; // zjednodušení

    let estimatedDate: string | null = null;
    let requiredMonthlyAmount: number | null = null;

    if (remaining <= 0) {
      estimatedDate = new Date().toISOString();
      requiredMonthlyAmount = 0;
    } else if (avgMonthly > 0) {
      const monthsNeeded = remaining / avgMonthly;
      const now = new Date();
      const est = new Date(now);
      est.setMonth(now.getMonth() + Math.ceil(monthsNeeded));
      estimatedDate = est.toISOString();
      requiredMonthlyAmount = avgMonthly;
    } else {
      // Bez historie navrhneme splnění do deadlinu rovnoměrně
      const deadline = new Date(g.deadline);
      const now = new Date();
      const monthsDiff =
        (deadline.getFullYear() - now.getFullYear()) * 12 +
        (deadline.getMonth() - now.getMonth());
      requiredMonthlyAmount = monthsDiff > 0 ? remaining / monthsDiff : remaining;
      estimatedDate = deadline.toISOString();
    }

    return NextResponse.json({
      estimatedDate,
      requiredMonthlyAmount,
      avgMonthlyContribution: avgMonthly
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při výpočtu forecastu' }, { status: 500 });
  } finally {
    await session.close();
  }
}

