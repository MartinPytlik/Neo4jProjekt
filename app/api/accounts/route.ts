export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';
import { neoDateToStr } from '@lib/helpers';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const accountSchema = z.object({
  name: z.string(),
  type: z.enum(['checking', 'savings', 'investment', 'crypto']),
  balance: z.number().default(0),
  bank: z.string()
});

const USER_ID = 'user-1';

export async function GET() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account)
      RETURN a ORDER BY a.createdAt
      `,
      { userId: USER_ID }
    );

    const accounts = result.records.map((r) => {
      const a = r.get('a').properties;
      return {
        id: a.id,
        name: a.name,
        type: a.type,
        balance: Number(a.balance ?? 0),
        bank: a.bank,
        createdAt: neoDateToStr(a.createdAt)
      };
    });

    return NextResponse.json(accounts);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při načítání účtů' }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = accountSchema.safeParse(json);

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
    const now = new Date().toISOString();
    await session.run(
      `
      MERGE (u:User {id: $userId})
        ON CREATE SET u.name = "Demo uživatel", u.email = "demo@example.com",
                      u.createdAt = $now, u.currency = "CZK"
      CREATE (a:Account {
        id: $id,
        name: $name,
        type: $type,
        balance: $balance,
        bank: $bank,
        createdAt: $now
      })
      MERGE (u)-[:HAS {primaryAccount: false}]->(a)
      RETURN a
      `,
      {
        userId: USER_ID,
        id,
        name: parsed.data.name,
        type: parsed.data.type,
        balance: parsed.data.balance,
        bank: parsed.data.bank,
        now
      }
    );

    return NextResponse.json({ id, ...parsed.data, createdAt: now }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při vytváření účtu' }, { status: 500 });
  } finally {
    await session.close();
  }
}
