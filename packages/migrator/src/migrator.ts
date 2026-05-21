// import { drizzle } from "drizzle-orm/mysql2";
import { NodePgDatabase, drizzle } from "drizzle-orm/node-postgres";
import mysql from "mysql2/promise";
import * as schema from "./schema";
export const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});
export const db = drizzle(connection, { schema });

import "dotenv/config";
import { migrate } from "drizzle-orm/mysql2/migrator";
// import { db, connection } from "./db";
// This will run migrations on the database, skipping the ones already applied
await migrate(db, { migrationsFolder: "./drizzle" });
// Don't forget to close the connection, otherwise the script will hang
await connection.end();
