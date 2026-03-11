import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';
import { neoDateToStr } from '@lib/helpers';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const USER_ID = 'user-1';

const transactionSchema = z.object({
  date: z.string(),
  amount: z.number(),
  description: z.string(),
  type: z.enum(['expense', 'income', 'transfer']),
  status: z.enum(['pending', 'completed', 'failed']).default('completed'),
  accountFromId: z.string(),
  accountToId: z.string().optional(),
  categoryId: z.string().optional(),
  merchantId: z.string().optional()
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const category = searchParams.get('category');
  const type = searchParams.get('type');

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account)<-[:FROM]-(t:Transaction)
      WHERE ($startDate IS NULL OR t.date >= date($startDate))
        AND ($endDate IS NULL OR t.date <= date($endDate))
        AND ($type IS NULL OR t.type = $type)
      OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
      WITH t, a, c
      WHERE $category IS NULL OR c.id = $category
      RETURN t, a, c
      ORDER BY t.date DESC
      LIMIT 300
      `,
      { userId: USER_ID, startDate, endDate, category, type }
    );

    const data = result.records.map((r) => {
      const t = r.get('t').properties;
      const c = r.get('c')?.properties;
      const a = r.get('a').properties;

      return {
        id: t.id,
        date: neoDateToStr(t.date),
        amount: Number(t.amount),
        description: t.description,
        type: t.type,
        status: t.status,
        accountFromId: a.id,
        accountName: a.name,
        categoryId: c?.id,
        categoryName: c?.name
      };
    });

    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při načítání transakcí' }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = transactionSchema.safeParse(json);

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
    const t = parsed.data;
    await session.executeWrite((tx) =>
      tx.run(
        `
        MATCH (u:User {id: $userId})-[:HAS]->(aFrom:Account {id: $accountFromId})
        OPTIONAL MATCH (aTo:Account {id: $accountToId})
        OPTIONAL MATCH (c:Category {id: $categoryId})
        OPTIONAL MATCH (m:Merchant {id: $merchantId})

        CREATE (tr:Transaction {
          id: $id,
          date: date($date),
          amount: $amount,
          description: $description,
          type: $type,
          status: $status
        })
        CREATE (tr)-[:FROM {date: date($date)}]->(aFrom)
        FOREACH (_ IN CASE WHEN aTo IS NULL THEN [] ELSE [1] END |
          CREATE (tr)-[:TO]->(aTo)
        )
        FOREACH (_ IN CASE WHEN c IS NULL THEN [] ELSE [1] END |
          CREATE (tr)-[:CATEGORIZED_AS {confidence: 1.0}]->(c)
        )
        FOREACH (_ IN CASE WHEN m IS NULL THEN [] ELSE [1] END |
          CREATE (tr)-[:SPENT_AT {timestamp: datetime($date)}]->(m)
        )
        `,
        {
          userId: USER_ID,
          id,
          date: t.date,
          amount: t.amount,
          description: t.description,
          type: t.type,
          status: t.status,
          accountFromId: t.accountFromId,
          accountToId: t.accountToId ?? null,
          categoryId: t.categoryId ?? null,
          merchantId: t.merchantId ?? null
        }
      )
    );

    return NextResponse.json({ id, ...parsed.data }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při vytváření transakce' }, { status: 500 });
  } finally {
    await session.close();
  }
}
