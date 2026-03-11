import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';

const USER_ID = 'user-1';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryName = searchParams.get('category');

  if (!categoryName) {
    return NextResponse.json({ error: 'Chybí parametr category' }, { status: 400 });
  }

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS]->(a:Account)<-[:FROM]-(t:Transaction {type: "expense"})-[:CATEGORIZED_AS]->(c:Category)
      WHERE c.name = $categoryName
        AND t.date >= date() - duration({ months: 6 })
      RETURN t, c
      `,
      { userId: USER_ID, categoryName }
    );

    const amounts = result.records.map((r) => Number(r.get('t').properties.amount));
    if (amounts.length === 0) {
      return NextResponse.json({
        category: categoryName,
        suggestion: 'Nemáš dostatek historie pro tuto kategorii.',
        recommendedBudget: 0
      });
    }

    const total = amounts.reduce((s, x) => s + x, 0);
    const avgMonthly = total / 6;
    const recommendedBudget = avgMonthly * 0.9; // mírně úspornější než průměr

    return NextResponse.json({
      category: categoryName,
      recommendedBudget,
      explanation:
        'Doporučený měsíční rozpočet je 90 % tvých průměrných výdajů za posledních 6 měsíců v této kategorii.'
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při doporučení rozpočtu' }, { status: 500 });
  } finally {
    await session.close();
  }
}

