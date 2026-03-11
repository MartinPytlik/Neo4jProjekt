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
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account)<-[:FROM]-(t:Transaction {type: "expense"})
      WHERE t.date >= date($startDate) AND t.date < date($endDate)
      OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
      OPTIONAL MATCH (c)-[:PARENT_OF*0..]->(root:Category)
      WHERE root.parent IS NULL OR root.parent IS NULL
      RETURN c, root, sum(toFloat(t.amount)) AS amount
      `,
      { userId: USER_ID, startDate, endDate }
    );

    const categories: Record<
      string,
      { category: string; amount: number; parentId?: string | null }
    > = {};

    for (const r of result.records) {
      const c = r.get('c')?.properties;
      const root = r.get('root')?.properties;
      const amount = Number(r.get('amount'));
      if (!c) continue;
      categories[c.id] = {
        category: c.name,
        amount: (categories[c.id]?.amount ?? 0) + amount,
        parentId: c.parent ?? null
      };
      if (root && !categories[root.id]) {
        categories[root.id] = {
          category: root.name,
          amount: 0,
          parentId: root.parent ?? null
        };
      }
    }

    const total = Object.values(categories).reduce((s, c) => s + c.amount, 0);

    const buildTree = (parentId: string | null): any[] =>
      Object.entries(categories)
        .filter(([, c]) => (c.parentId ?? null) === parentId)
        .map(([id, c]) => ({
          id,
          category: c.category,
          amount: c.amount,
          percentage: total > 0 ? (c.amount / total) * 100 : 0,
          subcategories: buildTree(id)
        }));

    const tree = buildTree(null);

    return NextResponse.json(tree);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při výpočtu breakdownu' }, { status: 500 });
  } finally {
    await session.close();
  }
}

