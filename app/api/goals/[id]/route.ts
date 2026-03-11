export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';
import { neoDateToStr } from '@lib/helpers';

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
      OPTIONAL MATCH (t:Transaction)-[:CONTRIBUTES_TO]->(g)
      RETURN g, collect(t) AS txs
      `,
      { userId: USER_ID, goalId: params.id }
    );

    if (result.records.length === 0) {
      return NextResponse.json({ error: 'Cíl nenalezen' }, { status: 404 });
    }

    const rec = result.records[0];
    const g = rec.get('g').properties;
    const txs = (rec.get('txs') as any[]).filter(Boolean);
    const target = Number(g.targetAmount);
    const current = Number(g.currentAmount ?? 0);
    const progress = target > 0 ? current / target : 0;

    return NextResponse.json({
      id: g.id,
      name: g.name,
      type: g.type,
      targetAmount: target,
      currentAmount: current,
      deadline: neoDateToStr(g.deadline),
      riskProfile: g.riskProfile,
      progress,
      contributionsCount: txs.length
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při načítání cíle' }, { status: 500 });
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
      MATCH (u:User {id: $userId})-[:CONTRIBUTES_TO]->(g:Goal {id: $goalId})
      DETACH DELETE g
      `,
      { userId: USER_ID, goalId: params.id }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při mazání cíle' }, { status: 500 });
  } finally {
    await session.close();
  }
}
