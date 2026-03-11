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
  const endDate = m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, '0')}-01`;

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account)<-[:FROM]-(t:Transaction)
      WHERE t.date >= date($startDate) AND t.date < date($endDate)
      OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
      OPTIONAL MATCH (t)-[:SPENT_AT]->(m:Merchant)
      RETURN a, t, c, m
      `,
      { userId: USER_ID, startDate, endDate }
    );

    const nodes: Record<string, { id: string; type: string; label: string }> = {};
    const edges: Array<{ from: string; to: string; amount: number }> = [];

    for (const r of result.records) {
      const a = r.get('a').properties;
      const t = r.get('t').properties;
      const c = r.get('c')?.properties;
      const m = r.get('m')?.properties;

      const accId = `acc-${a.id}`;
      nodes[accId] = { id: accId, type: 'account', label: a.name };

      const amount = Number(t.amount);

      if (t.type === 'income') {
        const sourceId = `source-${t.id}`;
        nodes[sourceId] = { id: sourceId, type: 'income', label: t.description };
        edges.push({ from: sourceId, to: accId, amount });
      }

      if (t.type === 'expense') {
        if (c) {
          const catId = `cat-${c.id}`;
          nodes[catId] = { id: catId, type: 'category', label: c.name };
          edges.push({ from: accId, to: catId, amount });
        }
        if (m) {
          const merId = `mer-${m.id}`;
          nodes[merId] = { id: merId, type: 'merchant', label: m.name };
          edges.push({ from: accId, to: merId, amount });
        }
      }
    }

    return NextResponse.json({
      month,
      nodes: Object.values(nodes),
      edges
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při výpočtu spending-flow' }, { status: 500 });
  } finally {
    await session.close();
  }
}

