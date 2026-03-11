import { NextResponse } from 'next/server';
import { getNeo4jDriver } from '@lib/neo4j';

export async function GET() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // 1. Uživatel + účty + karta
    await session.run(`
      MERGE (u:User {id: "user-1"})
      ON CREATE SET u.name = "Demo uživatel", u.email = "demo@example.com",
                    u.createdAt = datetime(), u.currency = "CZK"
      MERGE (acc1:Account {id: "acc-001"})
      ON CREATE SET acc1.name = "Běžný účet", acc1.type = "checking",
                    acc1.balance = 120000, acc1.bank = "Demo Banka", acc1.createdAt = datetime()
      MERGE (acc2:Account {id: "acc-002"})
      ON CREATE SET acc2.name = "Spořicí účet", acc2.type = "savings",
                    acc2.balance = 50000, acc2.bank = "Demo Banka", acc2.createdAt = datetime()
      MERGE (u)-[:HAS {primaryAccount: true}]->(acc1)
      MERGE (u)-[:HAS {primaryAccount: false}]->(acc2)
    `);

    // 2. Karta
    await session.run(`
      MATCH (u:User {id: "user-1"})
      MATCH (acc1:Account {id: "acc-001"})
      MERGE (card1:Card {id: "card-001"})
      ON CREATE SET card1.name = "Visa kreditka", card1.type = "credit",
                    card1.lastDigits = "4242", card1.limit = 50000
      MERGE (u)-[:OWNS]->(card1)
      MERGE (acc1)-[:LINKED_TO]->(card1)
    `);

    // 3. Kategorie výdajů + vztahy k uživateli
    await session.run(`
      MATCH (u:User {id: "user-1"})
      MERGE (c1:Category {id: "cat-food"})
        ON CREATE SET c1.name = "Jídlo", c1.type = "expense", c1.color = "#22c55e"
      MERGE (c2:Category {id: "cat-housing"})
        ON CREATE SET c2.name = "Bydlení", c2.type = "expense", c2.color = "#3b82f6"
      MERGE (c3:Category {id: "cat-transport"})
        ON CREATE SET c3.name = "Transport", c3.type = "expense", c3.color = "#a855f7"
      MERGE (c4:Category {id: "cat-entertainment"})
        ON CREATE SET c4.name = "Zábava", c4.type = "expense", c4.color = "#f97316"
      MERGE (c5:Category {id: "cat-health"})
        ON CREATE SET c5.name = "Zdraví", c5.type = "expense", c5.color = "#ec4899"
      MERGE (u)-[:HAS]->(c1)
      MERGE (u)-[:HAS]->(c2)
      MERGE (u)-[:HAS]->(c3)
      MERGE (u)-[:HAS]->(c4)
      MERGE (u)-[:HAS]->(c5)
    `);

    // 4. Kategorie příjmů
    await session.run(`
      MATCH (u:User {id: "user-1"})
      MERGE (c6:Category {id: "cat-salary"})
        ON CREATE SET c6.name = "Plat", c6.type = "income", c6.color = "#22c55e"
      MERGE (c7:Category {id: "cat-freelance"})
        ON CREATE SET c7.name = "Freelance", c7.type = "income", c7.color = "#eab308"
      MERGE (u)-[:HAS]->(c6)
      MERGE (u)-[:HAS]->(c7)
    `);

    // 5. Obchodníci
    await session.run(`
      MATCH (catFood:Category {id: "cat-food"})
      MERGE (m1:Merchant {id: "mer-001"})
        ON CREATE SET m1.name = "Supermarket", m1.category = "5411",
                      m1.locationCity = "Praha", m1.locationCountry = "CZ",
                      m1.avgTransactionSize = 800
      MERGE (m2:Merchant {id: "mer-002"})
        ON CREATE SET m2.name = "Coffee Bar", m2.category = "5814",
                      m2.locationCity = "Praha", m2.locationCountry = "CZ",
                      m2.avgTransactionSize = 120
      MERGE (m3:Merchant {id: "mer-003"})
        ON CREATE SET m3.name = "Netflix", m3.category = "4899",
                      m3.locationCity = "Online", m3.locationCountry = "US",
                      m3.avgTransactionSize = 250
      MERGE (m1)-[:IN_CATEGORY]->(catFood)
      MERGE (m2)-[:IN_CATEGORY]->(catFood)
    `);

    // 6. Cíl
    await session.run(`
      MATCH (u:User {id: "user-1"})
      MERGE (g:Goal {id: "goal-001"})
        ON CREATE SET g.name = "Dovolená", g.type = "savings",
                      g.targetAmount = 30000, g.currentAmount = 13500,
                      g.deadline = date("2024-08-31"), g.riskProfile = "medium"
      MERGE (u)-[:CONTRIBUTES_TO {transactionHistory: []}]->(g)
    `);

    // 7. Rozpočet + položky
    await session.run(`
      MATCH (u:User {id: "user-1"})
      MATCH (catFood:Category {id: "cat-food"})
      MATCH (catHousing:Category {id: "cat-housing"})
      MERGE (b:BudgetPlan {id: "budget-2024-02"})
        ON CREATE SET b.month = "2024-02", b.notes = "Demo rozpočet"
      MERGE (u)-[:FOLLOWS_BUDGET {month: "2024-02", adherence: 0.75}]->(b)
      MERGE (itemFood:BudgetCategoryItem {id: "bci-food-2024-02"})
        ON CREATE SET itemFood.budgetAmount = 10000
      MERGE (itemHousing:BudgetCategoryItem {id: "bci-housing-2024-02"})
        ON CREATE SET itemHousing.budgetAmount = 15000
      MERGE (b)-[:HAS_CATEGORY]->(itemFood)
      MERGE (itemFood)-[:FOR_CATEGORY]->(catFood)
      MERGE (b)-[:HAS_CATEGORY]->(itemHousing)
      MERGE (itemHousing)-[:FOR_CATEGORY]->(catHousing)
    `);

    // 8. Transakce – příjem (výplata)
    await session.run(`
      MATCH (acc1:Account {id: "acc-001"})
      MATCH (catSalary:Category {id: "cat-salary"})
      MERGE (t:Transaction {id: "tx-2024-02-salary"})
        ON CREATE SET t.date = date("2024-02-10"), t.amount = 60000,
                      t.description = "Výplata", t.type = "income", t.status = "completed"
      MERGE (t)-[:FROM {date: date("2024-02-10")}]->(acc1)
      MERGE (t)-[:CATEGORIZED_AS {confidence: 1.0}]->(catSalary)
    `);

    // 9. Transakce – příjem (freelance)
    await session.run(`
      MATCH (acc1:Account {id: "acc-001"})
      MATCH (catFreelance:Category {id: "cat-freelance"})
      MERGE (t:Transaction {id: "tx-2024-02-freelance"})
        ON CREATE SET t.date = date("2024-02-15"), t.amount = 8000,
                      t.description = "Freelance projekt", t.type = "income", t.status = "completed"
      MERGE (t)-[:FROM {date: date("2024-02-15")}]->(acc1)
      MERGE (t)-[:CATEGORIZED_AS {confidence: 1.0}]->(catFreelance)
    `);

    // 10. Transakce – nájem
    await session.run(`
      MATCH (acc1:Account {id: "acc-001"})
      MATCH (catHousing:Category {id: "cat-housing"})
      MERGE (t:Transaction {id: "tx-2024-02-rent"})
        ON CREATE SET t.date = date("2024-02-01"), t.amount = 15000,
                      t.description = "Nájem", t.type = "expense", t.status = "completed"
      MERGE (t)-[:FROM {date: date("2024-02-01")}]->(acc1)
      MERGE (t)-[:CATEGORIZED_AS {confidence: 1.0}]->(catHousing)
    `);

    // 11. Transakce – potraviny
    await session.run(`
      MATCH (acc1:Account {id: "acc-001"})
      MATCH (catFood:Category {id: "cat-food"})
      MATCH (mFood:Merchant {id: "mer-001"})
      MERGE (t1:Transaction {id: "tx-2024-02-food-1"})
        ON CREATE SET t1.date = date("2024-02-05"), t1.amount = 8500,
                      t1.description = "Nákup potravin", t1.type = "expense", t1.status = "completed"
      MERGE (t1)-[:FROM {date: date("2024-02-05")}]->(acc1)
      MERGE (t1)-[:CATEGORIZED_AS {confidence: 1.0}]->(catFood)
      MERGE (t1)-[:SPENT_AT {timestamp: datetime("2024-02-05T10:00:00")}]->(mFood)
      MERGE (t2:Transaction {id: "tx-2024-02-food-2"})
        ON CREATE SET t2.date = date("2024-02-18"), t2.amount = 6200,
                      t2.description = "Nákup potravin", t2.type = "expense", t2.status = "completed"
      MERGE (t2)-[:FROM {date: date("2024-02-18")}]->(acc1)
      MERGE (t2)-[:CATEGORIZED_AS {confidence: 1.0}]->(catFood)
      MERGE (t2)-[:SPENT_AT {timestamp: datetime("2024-02-18T18:30:00")}]->(mFood)
    `);

    // 12. Transakce – kavárny
    await session.run(`
      MATCH (acc1:Account {id: "acc-001"})
      MATCH (catFood:Category {id: "cat-food"})
      MATCH (mCafe:Merchant {id: "mer-002"})
      MERGE (t1:Transaction {id: "tx-2024-02-cafe-1"})
        ON CREATE SET t1.date = date("2024-02-03"), t1.amount = 120,
                      t1.description = "Latte", t1.type = "expense", t1.status = "completed"
      MERGE (t1)-[:FROM {date: date("2024-02-03")}]->(acc1)
      MERGE (t1)-[:CATEGORIZED_AS {confidence: 1.0}]->(catFood)
      MERGE (t1)-[:SPENT_AT {timestamp: datetime("2024-02-03T09:15:00")}]->(mCafe)
      MERGE (t2:Transaction {id: "tx-2024-02-cafe-2"})
        ON CREATE SET t2.date = date("2024-02-07"), t2.amount = 130,
                      t2.description = "Cappuccino", t2.type = "expense", t2.status = "completed"
      MERGE (t2)-[:FROM {date: date("2024-02-07")}]->(acc1)
      MERGE (t2)-[:CATEGORIZED_AS {confidence: 1.0}]->(catFood)
      MERGE (t2)-[:SPENT_AT {timestamp: datetime("2024-02-07T08:45:00")}]->(mCafe)
    `);

    // 13. Transakce – streaming
    await session.run(`
      MATCH (acc1:Account {id: "acc-001"})
      MATCH (catEnt:Category {id: "cat-entertainment"})
      MATCH (mStream:Merchant {id: "mer-003"})
      MERGE (t:Transaction {id: "tx-2024-02-streaming"})
        ON CREATE SET t.date = date("2024-02-12"), t.amount = 250,
                      t.description = "Netflix předplatné", t.type = "expense", t.status = "completed"
      MERGE (t)-[:FROM {date: date("2024-02-12")}]->(acc1)
      MERGE (t)-[:CATEGORIZED_AS {confidence: 1.0}]->(catEnt)
      MERGE (t)-[:SPENT_AT {timestamp: datetime("2024-02-12T07:00:00")}]->(mStream)
    `);

    // 14. Transakce – transport
    await session.run(`
      MATCH (acc1:Account {id: "acc-001"})
      MATCH (catTransport:Category {id: "cat-transport"})
      MERGE (t1:Transaction {id: "tx-2024-02-transport-1"})
        ON CREATE SET t1.date = date("2024-02-08"), t1.amount = 1200,
                      t1.description = "MHD měsíčník", t1.type = "expense", t1.status = "completed"
      MERGE (t1)-[:FROM {date: date("2024-02-08")}]->(acc1)
      MERGE (t1)-[:CATEGORIZED_AS {confidence: 1.0}]->(catTransport)
      MERGE (t2:Transaction {id: "tx-2024-02-transport-2"})
        ON CREATE SET t2.date = date("2024-02-21"), t2.amount = 2000,
                      t2.description = "Benzín", t2.type = "expense", t2.status = "completed"
      MERGE (t2)-[:FROM {date: date("2024-02-21")}]->(acc1)
      MERGE (t2)-[:CATEGORIZED_AS {confidence: 1.0}]->(catTransport)
    `);

    // 15. Transakce – převody na cíl (spoření na dovolenou)
    await session.run(`
      MATCH (acc1:Account {id: "acc-001"})
      MATCH (acc2:Account {id: "acc-002"})
      MATCH (g:Goal {id: "goal-001"})
      MERGE (t1:Transaction {id: "tx-2024-02-goal-1"})
        ON CREATE SET t1.date = date("2024-02-11"), t1.amount = 5000,
                      t1.description = "Spoření – dovolená", t1.type = "transfer", t1.status = "completed"
      MERGE (t1)-[:FROM {date: date("2024-02-11")}]->(acc1)
      MERGE (t1)-[:TO]->(acc2)
      MERGE (t1)-[:CONTRIBUTES_TO]->(g)
      MERGE (t2:Transaction {id: "tx-2024-02-goal-2"})
        ON CREATE SET t2.date = date("2024-02-25"), t2.amount = 3500,
                      t2.description = "Spoření – dovolená", t2.type = "transfer", t2.status = "completed"
      MERGE (t2)-[:FROM {date: date("2024-02-25")}]->(acc1)
      MERGE (t2)-[:TO]->(acc2)
      MERGE (t2)-[:CONTRIBUTES_TO]->(g)
    `);

    // 16. Aktuální měsíc (2026-03) – příjmy
    await session.run(`
      MATCH (acc1:Account {id: "acc-001"})
      MATCH (catSalary:Category {id: "cat-salary"})
      MATCH (catFreelance:Category {id: "cat-freelance"})
      MERGE (t1:Transaction {id: "tx-2026-03-salary"})
        ON CREATE SET t1.date = date("2026-03-10"), t1.amount = 62000,
                      t1.description = "Výplata", t1.type = "income", t1.status = "completed"
      MERGE (t1)-[:FROM {date: date("2026-03-10")}]->(acc1)
      MERGE (t1)-[:CATEGORIZED_AS {confidence: 1.0}]->(catSalary)
      MERGE (t2:Transaction {id: "tx-2026-03-freelance"})
        ON CREATE SET t2.date = date("2026-03-05"), t2.amount = 9500,
                      t2.description = "Freelance projekt", t2.type = "income", t2.status = "completed"
      MERGE (t2)-[:FROM {date: date("2026-03-05")}]->(acc1)
      MERGE (t2)-[:CATEGORIZED_AS {confidence: 1.0}]->(catFreelance)
    `);

    // 17. Aktuální měsíc (2026-03) – výdaje
    await session.run(`
      MATCH (acc1:Account {id: "acc-001"})
      MATCH (catFood:Category {id: "cat-food"})
      MATCH (catHousing:Category {id: "cat-housing"})
      MATCH (catTransport:Category {id: "cat-transport"})
      MATCH (catEnt:Category {id: "cat-entertainment"})
      MATCH (catHealth:Category {id: "cat-health"})
      MATCH (mFood:Merchant {id: "mer-001"})
      MATCH (mCafe:Merchant {id: "mer-002"})
      MATCH (mStream:Merchant {id: "mer-003"})
      MERGE (t1:Transaction {id: "tx-2026-03-rent"})
        ON CREATE SET t1.date = date("2026-03-01"), t1.amount = 16000,
                      t1.description = "Nájem", t1.type = "expense", t1.status = "completed"
      MERGE (t1)-[:FROM {date: date("2026-03-01")}]->(acc1)
      MERGE (t1)-[:CATEGORIZED_AS {confidence: 1.0}]->(catHousing)
      MERGE (t2:Transaction {id: "tx-2026-03-food-1"})
        ON CREATE SET t2.date = date("2026-03-03"), t2.amount = 2100,
                      t2.description = "Tesco nákup", t2.type = "expense", t2.status = "completed"
      MERGE (t2)-[:FROM {date: date("2026-03-03")}]->(acc1)
      MERGE (t2)-[:CATEGORIZED_AS {confidence: 1.0}]->(catFood)
      MERGE (t2)-[:SPENT_AT {timestamp: datetime("2026-03-03T17:00:00")}]->(mFood)
      MERGE (t3:Transaction {id: "tx-2026-03-food-2"})
        ON CREATE SET t3.date = date("2026-03-07"), t3.amount = 1850,
                      t3.description = "Albert nákup", t3.type = "expense", t3.status = "completed"
      MERGE (t3)-[:FROM {date: date("2026-03-07")}]->(acc1)
      MERGE (t3)-[:CATEGORIZED_AS {confidence: 1.0}]->(catFood)
      MERGE (t3)-[:SPENT_AT {timestamp: datetime("2026-03-07T11:00:00")}]->(mFood)
      MERGE (t4:Transaction {id: "tx-2026-03-cafe"})
        ON CREATE SET t4.date = date("2026-03-04"), t4.amount = 135,
                      t4.description = "Flat white", t4.type = "expense", t4.status = "completed"
      MERGE (t4)-[:FROM {date: date("2026-03-04")}]->(acc1)
      MERGE (t4)-[:CATEGORIZED_AS {confidence: 1.0}]->(catFood)
      MERGE (t4)-[:SPENT_AT {timestamp: datetime("2026-03-04T08:30:00")}]->(mCafe)
      MERGE (t5:Transaction {id: "tx-2026-03-transport"})
        ON CREATE SET t5.date = date("2026-03-02"), t5.amount = 1200,
                      t5.description = "MHD měsíčník", t5.type = "expense", t5.status = "completed"
      MERGE (t5)-[:FROM {date: date("2026-03-02")}]->(acc1)
      MERGE (t5)-[:CATEGORIZED_AS {confidence: 1.0}]->(catTransport)
      MERGE (t6:Transaction {id: "tx-2026-03-streaming"})
        ON CREATE SET t6.date = date("2026-03-08"), t6.amount = 329,
                      t6.description = "Netflix předplatné", t6.type = "expense", t6.status = "completed"
      MERGE (t6)-[:FROM {date: date("2026-03-08")}]->(acc1)
      MERGE (t6)-[:CATEGORIZED_AS {confidence: 1.0}]->(catEnt)
      MERGE (t6)-[:SPENT_AT {timestamp: datetime("2026-03-08T07:00:00")}]->(mStream)
      MERGE (t7:Transaction {id: "tx-2026-03-health"})
        ON CREATE SET t7.date = date("2026-03-06"), t7.amount = 850,
                      t7.description = "Lékárna", t7.type = "expense", t7.status = "completed"
      MERGE (t7)-[:FROM {date: date("2026-03-06")}]->(acc1)
      MERGE (t7)-[:CATEGORIZED_AS {confidence: 1.0}]->(catHealth)
    `);

    // 18. Loňský měsíc (2026-02) – pro srovnání trendů
    await session.run(`
      MATCH (acc1:Account {id: "acc-001"})
      MATCH (catFood:Category {id: "cat-food"})
      MATCH (catHousing:Category {id: "cat-housing"})
      MATCH (catTransport:Category {id: "cat-transport"})
      MATCH (catSalary:Category {id: "cat-salary"})
      MERGE (t1:Transaction {id: "tx-2026-02-salary"})
        ON CREATE SET t1.date = date("2026-02-10"), t1.amount = 62000,
                      t1.description = "Výplata", t1.type = "income", t1.status = "completed"
      MERGE (t1)-[:FROM {date: date("2026-02-10")}]->(acc1)
      MERGE (t1)-[:CATEGORIZED_AS {confidence: 1.0}]->(catSalary)
      MERGE (t2:Transaction {id: "tx-2026-02-rent"})
        ON CREATE SET t2.date = date("2026-02-01"), t2.amount = 16000,
                      t2.description = "Nájem", t2.type = "expense", t2.status = "completed"
      MERGE (t2)-[:FROM {date: date("2026-02-01")}]->(acc1)
      MERGE (t2)-[:CATEGORIZED_AS {confidence: 1.0}]->(catHousing)
      MERGE (t3:Transaction {id: "tx-2026-02-food"})
        ON CREATE SET t3.date = date("2026-02-05"), t3.amount = 3200,
                      t3.description = "Nákup potravin", t3.type = "expense", t3.status = "completed"
      MERGE (t3)-[:FROM {date: date("2026-02-05")}]->(acc1)
      MERGE (t3)-[:CATEGORIZED_AS {confidence: 1.0}]->(catFood)
      MERGE (t4:Transaction {id: "tx-2026-02-transport"})
        ON CREATE SET t4.date = date("2026-02-03"), t4.amount = 1200,
                      t4.description = "MHD měsíčník", t4.type = "expense", t4.status = "completed"
      MERGE (t4)-[:FROM {date: date("2026-02-03")}]->(acc1)
      MERGE (t4)-[:CATEGORIZED_AS {confidence: 1.0}]->(catTransport)
    `);

    return NextResponse.json({
      status: 'ok',
      message: 'Demo data úspěšně zapsána.',
      created: {
        users: 1, accounts: 2, cards: 1,
        categories: 7, merchants: 3,
        goals: 1, budgets: 1,
        transactions: '11 (2024-02) + 9 (2026-02) + 8 (2026-03)'
      }
    });
  } catch (e: any) {
    console.error('Seed error:', e?.message ?? e);
    return NextResponse.json(
      { error: 'Chyba při seedování dat', detail: e?.message ?? String(e) },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
