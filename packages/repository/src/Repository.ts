import {
  PgTableExtraConfig,
  PgTableWithColumns,
  pgSchema,
  pgTable,
  serial,
  text,
} from "drizzle-orm/pg-core";
import { Client } from "pg";
// import { migrate } from "drizzle-orm/postgres-js/migrator";
import { NodePgDatabase, drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";

const client = new Client({
  host: "127.0.0.1",
  port: 5432,
  user: "postgres",
  password: "password",
  database: "db_name",
});

let db: any | null = null;
const database = async () => {
  if (!db) {
    await client.connect();
    db = drizzle(client);
  }
  return db;
};

export const usersSchema = {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
};

// export const usersTableSchema = pgTable("users", usersSchema);

const model = (name: string, schema: string, columns: any) => {
  return pgSchema(schema).table(name, columns);
};

interface ModelBase {
  model: PgTableWithColumns<any>;
  lastAccess: number;
}

interface ModelsList {
  [key: string]: ModelBase;
}

abstract class RepositoryBase {
  private columns: any = null;
  private name: string = "";
  private models: ModelsList = {};
  private static instance: any;
  private static db: () => NodePgDatabase<Record<string, never>>;

  constructor(
    name: string,
    columns: any,
    db: () => NodePgDatabase<Record<string, never>>
  ) {
    if (!RepositoryBase.instance) {
      this.columns = columns;
      this.name = name;
      RepositoryBase.instance = this;
      RepositoryBase.db = db;
    }
    return RepositoryBase.instance;
  }

  static getInstance() {
    return this.instance;
  }

  getModel(schema: string) {
    let m = this.models[schema];
    if (!m) {
      m = {
        model: model(this.name, schema, this.columns),
        lastAccess: Date.now() / 1000,
      };
      this.models[schema] = m;
    } else {
      m.lastAccess = Date.now() / 1000;
    }

    this.models[schema] = m;
    return m.model;
  }

  protected select(schema: string, fields: any) {
    const db = RepositoryBase.db();
    let query;
    if (fields) {
      query = db.select(fields).from(this.getModel(schema)).$dynamic();
    } else {
      query = db.select().from(this.getModel(schema)).$dynamic();
    }
    return query;
  }

  protected insert(schema: string, values: any | any[]) {
    return RepositoryBase.db()
      .insert(this.getModel(schema))
      .values(values)
      .$dynamic();
  }

  protected update(schema: string, values: any | any[], where: any) {
    return RepositoryBase.db()
      .update(this.getModel(schema))
      .set(values)
      .where(where)
      .$dynamic();
  }

  protected delete(schema: string, where: any) {
    return RepositoryBase.db()
      .delete(this.getModel(schema))
      .where(where)
      .$dynamic();
  }

  abstract add(schema: string, values: any | any[]): Promise<any>;
  abstract get(schema: string, fields?: any): Promise<any>;
  abstract set(schema: string, values: any, where: any): Promise<any>;
  abstract remove(schema: string, where: any): Promise<any>;
}

class Repository extends RepositoryBase {
  async get(schema: string, fields?: any) {
    return await this.select(schema, fields).execute();
  }

  async getWhere(schema: string, fields: any, where: any) {
    return await this.select(schema, fields).where(where);
  }

  async getById(schema: string, fields: any, id: number | string) {
    return await this.select(schema, fields).where(
      eq(this.getModel(schema).id, id)
    );
  }

  async getWith() {}
  async getByIdWith() {}

  async find() {}
  async findAndCount() {}

  async download() {}

  async add(schema: string, values: any | any[]) {
    return await this.insert(schema, values).returning();
  }
  async addMany() {}

  async set(schema: string, values: any, where: any) {
    return await this.update(schema, values, where).returning();
  }
  async setBy(schema: string, values: any, id: string | number) {
    return await this.update(schema, values, {
      id,
    }).returning();
  }

  async archive() {}
  async archiveBy() {}
  async archiveMany() {}

  async unarchive() {}
  async unarchiveBy() {}
  async unarchiveMany() {}

  async remove(schema: string, where: any) {
    return await this.delete(schema, where).returning();
  }
  async removeById(schema: string, id: string | number) {
    return await this.delete(schema, {
      id,
    }).returning();
  }
  async removeMany() {}

  async count() {}
  async stats() {}
}

const userRepo = new Repository("users", usersSchema, () => db);

userRepo.get("users");

export { RepositoryBase };
