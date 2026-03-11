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
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account)<-[:FROM]-(t:Transaction {id: $txId})
      OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
      OPTIONAL MATCH (t)-[:SPENT_AT]->(m:Merchant)
      OPTIONAL MATCH (t)-[:TO]->(aTo:Account)
      RETURN t, a, aTo, c, m
      `,
      { userId: USER_ID, txId: params.id }
    );

    if (result.records.length === 0) {
      return NextResponse.json({ error: 'Transakce nenalezena' }, { status: 404 });
    }

    const r = result.records[0];
    const t = r.get('t').properties;
    const a = r.get('a').properties;
    const aTo = r.get('aTo')?.properties;
    const c = r.get('c')?.properties;
    const m = r.get('m')?.properties;

    return NextResponse.json({
      id: t.id,
      date: t.date,
      amount: Number(t.amount),
      description: t.description,
      type: t.type,
      status: t.status,
      accountFromId: a.id,
      accountToId: aTo?.id,
      category: c ? { id: c.id, name: c.name } : null,
      merchant: m
        ? {
            id: m.id,
            name: m.name,
            category: m.category,
            locationCity: m.locationCity,
            locationCountry: m.locationCountry
          }
        : null
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při načítání transakce' }, { status: 500 });
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
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account)<-[:FROM]-(t:Transaction {id: $txId})
      DETACH DELETE t
      `,
      { userId: USER_ID, txId: params.id }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při mazání transakce' }, { status: 500 });
  } finally {
    await session.close();
  }
}


