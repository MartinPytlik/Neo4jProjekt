import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';
import { z } from 'zod';

const USER_ID = 'user-1';

interface Params {
  params: { id: string };
}

const patchSchema = z.object({
  name: z.string().optional(),
  color: z.string().optional(),
  budget: z.number().nullable().optional()
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Neplatná data' }, { status: 400 });
  }

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const data = parsed.data;
    await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS]->(c:Category {id: $id})
      SET c.name = COALESCE($name, c.name),
          c.color = COALESCE($color, c.color),
          c.budget = CASE WHEN $budget IS NULL THEN c.budget ELSE $budget END
      `,
      {
        userId: USER_ID,
        id: params.id,
        name: data.name ?? null,
        color: data.color ?? null,
        budget: data.budget ?? null
      }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při úpravě kategorie' }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS]->(c:Category {id: $id})
      DETACH DELETE c
      `,
      { userId: USER_ID, id: params.id }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při mazání kategorie' }, { status: 500 });
  } finally {
    await session.close();
  }
}
