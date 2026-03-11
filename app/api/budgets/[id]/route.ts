export const dynamic = 'force-dynamic';

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
      MATCH (u:User {id: $userId})-[fb:FOLLOWS_BUDGET]->(b:BudgetPlan {id: $budgetId})
      OPTIONAL MATCH (b)-[:HAS_CATEGORY]->(item:BudgetCategoryItem)-[:FOR_CATEGORY]->(c:Category)
      RETURN b, fb, collect({category: c, item: item}) AS catItems
      `,
      { userId: USER_ID, budgetId: params.id }
    );

    if (result.records.length === 0) {
      return NextResponse.json({ error: 'Rozpočet nenalezen' }, { status: 404 });
    }

    const rec = result.records[0];
    const b = rec.get('b').properties;
    const fb = rec.get('fb').properties;
    const catItems = rec.get('catItems') as Array<{ category: any; item: any }>;

    const categories = catItems
      .filter((ci) => ci.category && ci.item)
      .map((ci) => ({
        categoryId: ci.category.properties.id,
        categoryName: ci.category.properties.name,
        budgetAmount: Number(ci.item.properties.budgetAmount)
      }));

    return NextResponse.json({
      id: b.id,
      month: b.month,
      notes: b.notes,
      adherence: Number(fb.adherence ?? 0),
      categories
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při načítání rozpočtu' }, { status: 500 });
  } finally {
    await session.close();
  }
}

