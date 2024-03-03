import type { DBConnectionAdapter } from "@repo/dbrouter/src/router";
import postgres from "postgres";

class PostgresProvider implements DBConnectionAdapter {
  #expire: number = 10000;

  connect: (
    connectionString: string,
    expire?: number
  ) => Promise<DBConnectionAdapter> = async () => {
    if (expire) {
      this.#expire = expire;
    }
    const sql = postgres(connectionString, {
      host: "", // Postgres ip address[s] or domain name[s]
      port: 5432, // Postgres server port[s]
      database: "", // Name of database to connect to
      username: "", // Username of database user
      password: "", // Password of database user
    });
  };
  disconnect: () => Promise<any> = async () => {
    return;
  };
  create: (connectionString: string) => Promise<any> = async () => {
    return;
  };
  isExpired: () => boolean = () => {
    return false;
  };
}
