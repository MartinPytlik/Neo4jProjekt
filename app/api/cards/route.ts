export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const USER_ID = 'user-1';

const cardSchema = z.object({
  name: z.string(),
  type: z.enum(['credit', 'debit']),
  lastDigits: z.string().min(4).max(4),
  limit: z.number().optional(),
  linkedAccountId: z.string().optional()
});

export async function GET() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:OWNS]->(c:Card)
      OPTIONAL MATCH (a:Account)-[:LINKED_TO]->(c)
      RETURN c, a
      ORDER BY c.name
      `,
      { userId: USER_ID }
    );

    const cards = result.records.map((r) => {
      const c = r.get('c').properties;
      const a = r.get('a')?.properties;
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        lastDigits: c.lastDigits,
        limit: c.limit ? Number(c.limit) : undefined,
        linkedAccountId: a?.id
      };
    });

    return NextResponse.json(cards);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při načítání karet' }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = cardSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Neplatná data', details: parsed.error.flatten() }, { status: 400 });
  }

  const driver = getNeo4jDriver();
  const session = driver.session();
  const id = randomUUID();

  try {
    const data = parsed.data;
    await session.executeWrite((tx) =>
      tx.run(
        `
        MATCH (u:User {id: $userId})
        OPTIONAL MATCH (a:Account {id: $linkedAccountId})
        CREATE (c:Card {
          id: $id,
          name: $name,
          type: $type,
          lastDigits: $lastDigits,
          limit: $limit
        })
        MERGE (u)-[:OWNS]->(c)
        FOREACH (_ IN CASE WHEN a IS NULL THEN [] ELSE [1] END |
          MERGE (a)-[:LINKED_TO]->(c)
        )
        `,
        {
          userId: USER_ID,
          id,
          name: data.name,
          type: data.type,
          lastDigits: data.lastDigits,
          limit: data.limit ?? null,
          linkedAccountId: data.linkedAccountId ?? null
        }
      )
    );

    return NextResponse.json({ id, ...parsed.data }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při vytváření karty' }, { status: 500 });
  } finally {
    await session.close();
  }
}

