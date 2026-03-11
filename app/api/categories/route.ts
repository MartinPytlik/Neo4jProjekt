export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const USER_ID = 'user-1';

const categorySchema = z.object({
  name: z.string(),
  type: z.enum(['expense', 'income']),
  color: z.string().default('#6366f1'),
  budget: z.number().optional(),
  parentId: z.string().optional()
});

export async function GET() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS]->(c:Category)
      OPTIONAL MATCH (parent:Category)-[:PARENT_OF]->(c)
      RETURN c, parent.id AS parentId
      ORDER BY c.type, c.name
      `,
      { userId: USER_ID }
    );

    const categories = result.records.map((r) => {
      const c = r.get('c').properties;
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        color: c.color,
        budget: c.budget ? Number(c.budget) : undefined,
        parentId: r.get('parentId') ?? undefined
      };
    });

    return NextResponse.json(categories);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při načítání kategorií' }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = categorySchema.safeParse(json);

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
    await session.executeWrite((tx) =>
      tx.run(
        `
        MATCH (u:User {id: $userId})
        OPTIONAL MATCH (parent:Category {id: $parentId})
        CREATE (c:Category {
          id: $id,
          name: $name,
          type: $type,
          color: $color
        })
        MERGE (u)-[:HAS]->(c)
        FOREACH (_ IN CASE WHEN parent IS NULL THEN [] ELSE [1] END |
          MERGE (parent)-[:PARENT_OF]->(c)
        )
        `,
        {
          userId: USER_ID,
          id,
          name: data.name,
          type: data.type,
          color: data.color,
          parentId: data.parentId ?? null
        }
      )
    );

    return NextResponse.json({ id, ...parsed.data }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při vytváření kategorie' }, { status: 500 });
  } finally {
    await session.close();
  }
}
