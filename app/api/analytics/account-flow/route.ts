export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';

const USER_ID = 'user-1';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('account');
  if (!accountId) {
    return NextResponse.json({ error: 'Chybí parametr account' }, { status: 400 });
  }

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account {id: $accountId})
      OPTIONAL MATCH (tIn:Transaction {type: "income"})-[:FROM]->(a)
      OPTIONAL MATCH (tOut:Transaction {type: "expense"})-[:FROM]->(a)-[:CATEGORIZED_AS]->(c:Category)
      RETURN collect({t: tIn}) AS inflows,
             collect({t: tOut, c: c}) AS outflows
      `,
      { userId: USER_ID, accountId }
    );

    if (result.records.length === 0) {
      return NextResponse.json({ error: 'Účet nenalezen' }, { status: 404 });
    }

    const rec = result.records[0];
    const inflows = (rec.get('inflows') as any[]).filter((x) => x.t);
    const outflows = (rec.get('outflows') as any[]).filter((x) => x.t);

    const totalInflow = inflows.reduce(
      (s, x) => s + Number(x.t.properties.amount ?? 0),
      0
    );
    const totalOutflow = outflows.reduce(
      (s, x) => s + Number(x.t.properties.amount ?? 0),
      0
    );

    const byCategory: Record<
      string,
      { category: string; inflow: number; outflow: number }
    > = {};

    for (const x of outflows) {
      const t = x.t.properties;
      const c = x.c?.properties;
      const name = c?.name ?? 'Nezařazeno';
      if (!byCategory[name]) {
        byCategory[name] = { category: name, inflow: 0, outflow: 0 };
      }
      byCategory[name].outflow += Number(t.amount ?? 0);
    }

    const rows = Object.values(byCategory).map((r) => ({
      category: r.category,
      inflow: r.inflow,
      outflow: r.outflow,
      netFlow: r.inflow - r.outflow
    }));

    return NextResponse.json({
      totalInflow,
      totalOutflow,
      netFlow: totalInflow - totalOutflow,
      breakdown: rows
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při výpočtu account-flow' }, { status: 500 });
  } finally {
    await session.close();
  }
}

