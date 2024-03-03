import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres({});
const db: PostgresJsDatabase = drizzle(client);

const main = async () => {
  //   await db.select().from(users).where({ id: 1 });
};

main();
