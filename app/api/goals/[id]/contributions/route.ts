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
      MATCH (t:Transaction)-[:CONTRIBUTES_TO]->(g)
      OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
      RETURN t, c
      ORDER BY t.date DESC
      `,
      { userId: USER_ID, goalId: params.id }
    );

    const contributions = result.records.map((r) => {
      const t = r.get('t').properties;
      const c = r.get('c')?.properties;
      return {
        id: t.id,
        date: t.date,
        amount: Number(t.amount),
        description: t.description,
        categoryName: c?.name
      };
    });

    return NextResponse.json(contributions);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při načítání příspěvků' }, { status: 500 });
  } finally {
    await session.close();
  }
}

