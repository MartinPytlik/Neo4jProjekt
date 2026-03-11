import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';

const USER_ID = 'user-1';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const threshold = Number(searchParams.get('threshold') ?? '0.9');

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account)<-[:FROM]-(t:Transaction {type: "expense"})
      OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(c:Category)
      OPTIONAL MATCH (t)-[:SPENT_AT]->(m:Merchant)
      RETURN t, c, m
      `,
      { userId: USER_ID }
    );

    type Stat = { sum: number; sumSq: number; count: number };
    const statsByCategory: Record<string, Stat> = {};

    const txs: Array<{
      t: any;
      categoryName: string;
      merchantName?: string;
    }> = [];

    for (const r of result.records) {
      const t = r.get('t').properties;
      const c = r.get('c')?.properties;
      const m = r.get('m')?.properties;
      const catName = c?.name ?? 'Nezařazeno';
      const amount = Number(t.amount);

      if (!statsByCategory[catName]) {
        statsByCategory[catName] = { sum: 0, sumSq: 0, count: 0 };
      }
      const s = statsByCategory[catName];
      s.sum += amount;
      s.sumSq += amount * amount;
      s.count += 1;

      txs.push({ t, categoryName: catName, merchantName: m?.name });
    }

    const anomalies = [];

    for (const { t, categoryName, merchantName } of txs) {
      const stat = statsByCategory[categoryName];
      if (!stat || stat.count < 5) continue; // málo dat

      const mean = stat.sum / stat.count;
      const variance = stat.sumSq / stat.count - mean * mean;
      const std = Math.sqrt(Math.max(variance, 0));

      if (std === 0) continue;

      const amount = Number(t.amount);
      const z = Math.abs((amount - mean) / std);

      // z-score 3 ~ anomalyScore ~ 0.9 (zjednodušeně)
      const anomalyScore = Math.min(z / 3, 1);
      if (anomalyScore < threshold) continue;

      anomalies.push({
        transactionId: t.id,
        date: t.date,
        amount,
        merchant: merchantName ?? 'Neznámý obchodník',
        category: categoryName,
        anomalyScore,
        reason: `Částka je ${(amount / mean).toFixed(1)}x vyšší než tvůj průměr v kategorii (normálně ${mean.toFixed(
          0
        )} Kč)`,
        location: t.metadata?.location ?? 'Neuvedeno',
        timePattern: 'Jednoduchá detekce podle částky',
        recommendation: 'Zkontroluj transakci – může jít o anomálii.'
      });
    }

    return NextResponse.json({ anomalies });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při detekci anomálií' }, { status: 500 });
  } finally {
    await session.close();
  }
}

