import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const USER_ID = 'user-1';

const budgetSchema = z.object({
  month: z.string(),
  notes: z.string().optional(),
  categories: z
    .array(z.object({ categoryId: z.string(), budgetAmount: z.number() }))
    .default([])
});

export async function GET() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[fb:FOLLOWS_BUDGET]->(b:BudgetPlan)
      RETURN b, fb
      ORDER BY b.month DESC
      `,
      { userId: USER_ID }
    );

    const budgets = result.records.map((r) => {
      const b = r.get('b').properties;
      const fb = r.get('fb').properties;
      return {
        id: b.id,
        month: b.month,
        notes: b.notes,
        adherence: Number(fb.adherence ?? 0)
      };
    });

    return NextResponse.json(budgets);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při načítání rozpočtů' }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = budgetSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Neplatná data', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const driver = getNeo4jDriver();
  const session = driver.session();
  const id = randomUUID();

  try {
    const data = parsed.data;

    if (data.categories.length > 0) {
      await session.executeWrite((tx) =>
        tx.run(
          `
          MATCH (u:User {id: $userId})
          CREATE (b:BudgetPlan { id: $id, month: $month, notes: $notes })
          MERGE (u)-[:FOLLOWS_BUDGET {month: $month, adherence: 0.0}]->(b)
          WITH b
          UNWIND $categories AS cat
          MATCH (c:Category {id: cat.categoryId})
          CREATE (item:BudgetCategoryItem {budgetAmount: cat.budgetAmount})
          MERGE (b)-[:HAS_CATEGORY]->(item)
          MERGE (item)-[:FOR_CATEGORY]->(c)
          `,
          {
            userId: USER_ID,
            id,
            month: data.month,
            notes: data.notes ?? null,
            categories: data.categories
          }
        )
      );
    } else {
      await session.executeWrite((tx) =>
        tx.run(
          `
          MATCH (u:User {id: $userId})
          CREATE (b:BudgetPlan { id: $id, month: $month, notes: $notes })
          MERGE (u)-[:FOLLOWS_BUDGET {month: $month, adherence: 0.0}]->(b)
          `,
          { userId: USER_ID, id, month: data.month, notes: data.notes ?? null }
        )
      );
    }

    return NextResponse.json({ id, ...parsed.data }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při vytváření rozpočtu' }, { status: 500 });
  } finally {
    await session.close();
  }
}
