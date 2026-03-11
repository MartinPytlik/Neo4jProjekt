# Personal Finance Network (Neo4j + Next.js)

Full‑stack aplikace pro správu osobních financí a investic postavená na **Next.js 14**, **TypeScriptu**, **Tailwind CSS** a **Neo4j** (v Dockeru).

## 1. Spuštění Neo4j v Dockeru

V kořeni projektu:

```bash
docker compose up -d
```

To spustí kontejner `neo4j:5` s přihlašovacími údaji:

- uživatel: `neo4j`
- heslo: `password`
- Bolt: `neo4j://localhost:7687`

Tyto hodnoty jsou už připravené v `.env.example`.

## 2. Konfigurace `.env`

Vytvoř si soubor `.env` (v kořeni projektu) a zkopíruj do něj obsah z `.env.example`. Pro výchozí Docker konfiguraci stačí:

```env
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
```

Pokud změníš heslo v `docker-compose.yml` (proměnná `NEO4J_AUTH`), musíš stejnou kombinaci uživatel/heslo nastavit i tady.

## 3. Instalace a spuštění aplikace

```bash
npm install
npm run dev
```

Pak otevři `http://localhost:3000`.

## 4. Demo data do Neo4j

### 4.1 Rychlý seed přes API

Nejjednodušší cesta je použít připravený endpoint:

```bash
curl http://localhost:3000/api/dev/seed
```

nebo otevřít v prohlížeči:

- `http://localhost:3000/api/dev/seed`

Endpoint vytvoří:

- uživatele `user-1`,
- 2 účty (`acc-001`, `acc-002`),
- kreditní kartu,
- hlavní kategorie (Jídlo, Bydlení, Transport, Zábava, Plat),
- jednoho uživatele cíle „Dovolená“,
- rozpočet `budget-2024-02` s položkami,
- několik příjmů a výdajů za únor 2024 (jídlo, nájem, kavárny, streaming, převody na cíl).

Po seednutí uvidíš data na dashboardu, v `/transactions`, `/analytics`, `/budget`, `/goals` i `/recommendations`.

### 4.2 Ruční Cypher skript (alternativa)

Po prvním **POST /api/accounts** se automaticky vytvoří demo uživatel `user-1`. Můžeš si ale nahrát i pár demo dat ručně v Neo4j Browseru (`http://localhost:7474`):

```cypher
// Demo user
MERGE (u:User {id: "user-1"})
SET u.name = "Demo uživatel",
    u.email = "demo@example.com",
    u.createdAt = datetime(),
    u.currency = "CZK";

// Účty
CREATE (acc1:Account {
  id: "acc-001",
  name: "Běžný účet",
  type: "checking",
  balance: 120000,
  bank: "Demo Banka",
  createdAt: datetime()
});

CREATE (acc2:Account {
  id: "acc-002",
  name: "Spořicí účet",
  type: "savings",
  balance: 50000,
  bank: "Demo Banka",
  createdAt: datetime()
});

MERGE (u)-[:HAS {primaryAccount: true}]->(acc1);
MERGE (u)-[:HAS {primaryAccount: false}]->(acc2);

// Kategorie
CREATE (catFood:Category {id: "cat-food", name: "Jídlo", type: "expense", color: "#22c55e"});
CREATE (catHousing:Category {id: "cat-housing", name: "Bydlení", type: "expense", color: "#3b82f6"});
CREATE (catSalary:Category {id: "cat-salary", name: "Plat", type: "income", color: "#f97316"});

MERGE (u)-[:HAS]->(catFood);
MERGE (u)-[:HAS]->(catHousing);
MERGE (u)-[:HAS]->(catSalary);

// Obchodník
CREATE (m1:Merchant {
  id: "mer-001",
  name: "Supermarket",
  category: "5411",
  locationCity: "Praha",
  locationCountry: "CZ",
  avgTransactionSize: 800
});

MERGE (m1)-[:IN_CATEGORY]->(catFood);

// Pár demo transakcí
WITH u, acc1, catFood, catHousing, m1
CREATE (t1:Transaction {
  id: "tx-001",
  date: date("2024-02-05"),
  amount: 8500,
  description: "Nákup potravin",
  type: "expense",
  status: "completed"
})
CREATE (t1)-[:FROM {date: date("2024-02-05")}]->(acc1)
CREATE (t1)-[:CATEGORIZED_AS {confidence: 1.0}]->(catFood)
CREATE (t1)-[:SPENT_AT {timestamp: datetime("2024-02-05T10:00:00")}]->(m1);

WITH u, acc1, catHousing
CREATE (t2:Transaction {
  id: "tx-002",
  date: date("2024-02-01"),
  amount: 15000,
  description: "Nájem",
  type: "expense",
  status: "completed"
})
CREATE (t2)-[:FROM {date: date("2024-02-01")}]->(acc1)
CREATE (t2)-[:CATEGORIZED_AS {confidence: 1.0}]->(catHousing);

WITH u, acc1, catSalary
CREATE (t3:Transaction {
  id: "tx-003",
  date: date("2024-02-10"),
  amount: 60000,
  description: "Výplata",
  type: "income",
  status: "completed"
})
CREATE (t3)-[:FROM {date: date("2024-02-10")}]->(acc1)
CREATE (t3)-[:CATEGORIZED_AS {confidence: 1.0}]->(catSalary);
```

Potom uvidíš data na dashboardu a v přehledech transakcí/analytiky.

