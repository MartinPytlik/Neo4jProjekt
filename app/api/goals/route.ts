export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';
import { neoDateToStr } from '@lib/helpers';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const USER_ID = 'user-1';

const goalSchema = z.object({
  name: z.string(),
  type: z.enum(['savings', 'investment', 'debt_payoff']),
  targetAmount: z.number(),
  currentAmount: z.number().default(0),
  deadline: z.string(),
  riskProfile: z.enum(['low', 'medium', 'high'])
});

export async function GET() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:CONTRIBUTES_TO]->(g:Goal)
      RETURN g
      ORDER BY g.deadline
      `,
      { userId: USER_ID }
    );

    const goals = result.records.map((r) => {
      const g = r.get('g').properties;
      const target = Number(g.targetAmount);
      const current = Number(g.currentAmount ?? 0);
      const progress = target > 0 ? current / target : 0;

      return {
        id: g.id,
        name: g.name,
        type: g.type,
        targetAmount: target,
        currentAmount: current,
        deadline: neoDateToStr(g.deadline),
        riskProfile: g.riskProfile,
        progress
      };
    });

    return NextResponse.json(goals);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při načítání cílů' }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = goalSchema.safeParse(json);

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
    const g = parsed.data;
    await session.executeWrite((tx) =>
      tx.run(
        `
        MATCH (u:User {id: $userId})
        CREATE (g:Goal {
          id: $id,
          name: $name,
          type: $type,
          targetAmount: $targetAmount,
          currentAmount: $currentAmount,
          deadline: date($deadline),
          riskProfile: $riskProfile
        })
        MERGE (u)-[:CONTRIBUTES_TO {transactionHistory: []}]->(g)
        `,
        {
          userId: USER_ID,
          id,
          name: g.name,
          type: g.type,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          deadline: g.deadline,
          riskProfile: g.riskProfile
        }
      )
    );

    return NextResponse.json({ id, ...parsed.data }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při vytváření cíle' }, { status: 500 });
  } finally {
    await session.close();
  }
}
