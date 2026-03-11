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
      MATCH (u:User {id: $userId})-[fb:FOLLOWS_BUDGET]->(b:BudgetPlan {id: $budgetId})
      OPTIONAL MATCH (b)-[:HAS_CATEGORY]->(item:BudgetCategoryItem)-[:FOR_CATEGORY]->(c:Category)
      WITH u, b, fb, collect({category: c, item: item}) AS catItems
      WITH u, b, fb, catItems,
           substring(b.month, 0, 4) AS year,
           substring(b.month, 5, 2) AS month
      WITH u, b, fb, catItems,
           date(year + '-' + month + '-01') AS startDate,
           (CASE WHEN month = '12'
                 THEN date(toString(toInteger(year) + 1) + '-01-01')
                 ELSE date(year + '-' + right('0' + toString(toInteger(month) + 1), 2) + '-01')
            END) AS endDate
      MATCH (u)-[:HAS]->(a:Account)<-[:FROM]-(t:Transaction {type: "expense"})
      OPTIONAL MATCH (t)-[:CATEGORIZED_AS]->(ct:Category)
      WHERE t.date >= startDate AND t.date < endDate
      WITH b, fb, catItems, ct, t
      RETURN b, fb, catItems,
             collect({category: ct, amount: toFloat(t.amount)}) AS expenses
      `,
      { userId: USER_ID, budgetId: params.id }
    );

    if (result.records.length === 0) {
      return NextResponse.json({ error: 'Rozpočet nenalezen' }, { status: 404 });
    }

    const rec = result.records[0];
    const catItems = rec.get('catItems') as Array<{ category: any; item: any }>;
    const expenses = rec.get('expenses') as Array<{ category: any; amount: number }>;

    const plannedByCat: Record<string, { name: string; planned: number }> = {};
    for (const ci of catItems) {
      if (!ci.category || !ci.item) continue;
      const id = ci.category.properties.id as string;
      plannedByCat[id] = {
        name: ci.category.properties.name,
        planned: Number(ci.item.properties.budgetAmount)
      };
    }

    const actualByCat: Record<string, number> = {};
    for (const e of expenses) {
      const cat = e.category;
      if (!cat) continue;
      const id = cat.properties.id as string;
      actualByCat[id] = (actualByCat[id] ?? 0) + Number(e.amount);
    }

    const allCatIds = Array.from(new Set([...Object.keys(plannedByCat), ...Object.keys(actualByCat)]));

    const rows = allCatIds.map((id) => {
      const planned = plannedByCat[id]?.planned ?? 0;
      const name = plannedByCat[id]?.name ?? 'Nezařazeno';
      const actual = actualByCat[id] ?? 0;
      const remaining = planned - actual;
      const percentageUsed = planned > 0 ? actual / planned : 0;

      return {
        categoryId: id,
        category: name,
        planned,
        actual,
        remaining,
        percentageUsed
      };
    });

    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chyba při výpočtu rozpočet vs. skutečnost' }, { status: 500 });
  } finally {
    await session.close();
  }
}

