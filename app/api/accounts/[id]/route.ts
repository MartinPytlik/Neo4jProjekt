import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';
import { z } from 'zod';

const USER_ID = 'user-1';

interface Params {
  params: { id: string };
}

const patchSchema = z.object({
  name: z.string().optional(),
  balance: z.number().optional(),
  bank: z.string().optional()
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
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account {id: $accountId})
      SET a.name   = COALESCE($name, a.name),
          a.bank   = COALESCE($bank, a.bank),
          a.balance = COALESCE($balance, a.balance)
      `,
      {
        userId: USER_ID,
        accountId: params.id,
        name: data.name ?? null,
        bank: data.bank ?? null,
        balance: data.balance ?? null
      }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při úpravě účtu' }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // Zkontrolujeme, zda má účet transakce
    const check = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account {id: $accountId})
      OPTIONAL MATCH (t:Transaction)-[:FROM]->(a)
      RETURN a, count(t) AS txCount
      `,
      { userId: USER_ID, accountId: params.id }
    );

    if (check.records.length === 0) {
      return NextResponse.json({ error: 'Účet nenalezen' }, { status: 404 });
    }

    const txCount = Number(check.records[0].get('txCount'));
    if (txCount > 0) {
      return NextResponse.json(
        { error: `Účet nelze smazat – má ${txCount} transakci/í. Nejprve smaž transakce.` },
        { status: 409 }
      );
    }

    await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account {id: $accountId})
      DETACH DELETE a
      `,
      { userId: USER_ID, accountId: params.id }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při mazání účtu' }, { status: 500 });
  } finally {
    await session.close();
  }
}
