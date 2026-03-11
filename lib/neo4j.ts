import neo4j, { Driver } from 'neo4j-driver';

/**
 * V Next.js dev módu dochází při každém hot-reloadu k re-evaluaci modulů.
 * Pokud by driver žil jen v module-level proměnné, při každém reloadu by
 * vznikl nový driver, starý by nebyl uzavřen a jeho connections by "visely"
 * v poolu → pool se zaplní a další requesty selžou s "Connection acquisition timed out".
 *
 * Řešení: driver ukládáme do globalThis, které přežívá hot-reload.
 * Stejný pattern doporučuje Prisma i další knihovny pro Next.js.
 */
const g = globalThis as typeof globalThis & { _neo4jDriver?: Driver };

export function getNeo4jDriver(): Driver {
  if (!g._neo4jDriver) {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';

    g._neo4jDriver = neo4j.driver(
      uri,
      neo4j.auth.basic(user, password),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 30_000,
      }
    );
  }
  return g._neo4jDriver;
}

export async function closeDriver(): Promise<void> {
  if (g._neo4jDriver) {
    await g._neo4jDriver.close();
    g._neo4jDriver = undefined;
  }
}
