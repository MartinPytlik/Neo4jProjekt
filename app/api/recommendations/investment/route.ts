import { NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';

const USER_ID = 'user-1';

export async function GET() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account)
      RETURN sum(toFloat(a.balance)) AS totalBalance
      `,
      { userId: USER_ID }
    );

    const totalBalance = Number(result.records[0]?.get('totalBalance') ?? 0);
    const freeCash = totalBalance * 0.2;

    const recommendations = [
      {
        asset: 'Globální akciový ETF',
        expectedReturn: 0.07,
        risk: 'medium',
        amountSuggestion: freeCash * 0.5,
        reason:
          'Dlouhodobá diverzifikovaná investice, vhodná pro středně rizikový profil.'
      },
      {
        asset: 'Dluhopisový fond',
        expectedReturn: 0.03,
        risk: 'low',
        amountSuggestion: freeCash * 0.3,
        reason: 'Stabilizuje portfolio a snižuje volatilitu.'
      },
      {
        asset: 'Hotovost / spořicí účet',
        expectedReturn: 0.015,
        risk: 'low',
        amountSuggestion: freeCash * 0.2,
        reason: 'Rezerva na neočekávané výdaje (3–6 měsíčních nákladů).'
      }
    ];

    return NextResponse.json(recommendations);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při generování investičních doporučení' }, { status: 500 });
  } finally {
    await session.close();
  }
}

