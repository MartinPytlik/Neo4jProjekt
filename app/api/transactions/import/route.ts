import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';
import { randomUUID } from 'crypto';

const USER_ID = 'user-1';

export async function POST(req: NextRequest) {
  const text = await req.text().catch(() => '');
  if (!text) {
    return NextResponse.json({ error: 'Prázdný obsah CSV' }, { status: 400 });
  }

  // velmi jednoduchý CSV parser: očekává hlavičku: date,amount,description,type,accountFromId
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const [header, ...rows] = lines;
  const cols = header.split(',').map((c) => c.trim());

  const required = ['date', 'amount', 'description', 'type', 'accountFromId'];
  if (!required.every((c) => cols.includes(c))) {
    return NextResponse.json(
      { error: 'CSV musí obsahovat hlavičku: date,amount,description,type,accountFromId' },
      { status: 400 }
    );
  }

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const created: string[] = [];

    for (const row of rows) {
      const values = row.split(',');
      if (values.length !== cols.length) continue;
      const record: Record<string, string> = {};
      cols.forEach((c, i) => {
        record[c] = values[i];
      });

      const id = randomUUID();
      await session.run(
        `
        MATCH (u:User {id: $userId})-[:HAS]->(aFrom:Account {id: $accountFromId})
        CREATE (t:Transaction {
          id: $id,
          date: date($date),
          amount: toFloat($amount),
          description: $description,
          type: $type,
          status: "completed"
        })
        CREATE (t)-[:FROM {date: date($date)}]->(aFrom)
        `,
        {
          userId: USER_ID,
          id,
          date: record['date'],
          amount: record['amount'],
          description: record['description'],
          type: record['type'],
          accountFromId: record['accountFromId']
        }
      );
      created.push(id);
    }

    return NextResponse.json({ imported: created.length, ids: created });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při importu CSV' }, { status: 500 });
  } finally {
    await session.close();
  }
}

