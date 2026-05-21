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

// utils
const prepareRecords = (
  rows: any[],
  mainKey: string,
  joinedKey: string,
  obj: any = {}
) => {
  return rows.reduce<Record<number, any>>((acc, row) => {
    const main = row[mainKey];
    const joined = row[joinedKey];

    if (!acc[main.id]) {
      acc[main.id] = { main, [joinedKey]: [] };
    }
    if (joined) {
      acc[main.id][joinedKey].push(joined);
    }
    return acc;
  }, obj);
};

// connect to db
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
    return RepositoryBase.db()
      .select(fields)
      .from(this.getModel(schema))
      .$dynamic();
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

  abstract add(
    schema: string,
    values: any | any[],
    onConflict?: any
  ): Promise<any>;
  abstract get(schema: string, fields?: any): Promise<any>;
  abstract set(schema: string, values: any, where: any): Promise<any>;
  abstract removeWhere(schema: string, where: any): Promise<any>;
}

class Repository extends RepositoryBase {
  // select
  async get(schema: string, fields?: any) {
    return await this.select(schema, fields).execute();
  }

  async getWhere(schema: string, fields: any, where: any) {
    return await this.select(schema, fields).where(where);
  }

  async getById(
    schema: string,
    fields: any,
    id: number | string,
    dynamic?: boolean
  ) {
    const query = this.select(schema, fields)
      .where(eq(this.getModel(schema).id, id))
      .$dynamic();

    return dynamic ? query : await query.execute();
  }

  async getWith(
    schema: string,
    leftJoin: any | any[],
    fields: any,
    where: any
  ) {
    const query = this.select(schema, fields);
    if (Array.isArray(leftJoin)) {
      leftJoin.forEach((join) => {
        query.leftJoin(join.repository.getModel(schema), join.on).$dynamic();
      });
    } else {
      query
        .leftJoin(leftJoin.repository.getModel(schema), leftJoin.on)
        .$dynamic();
    }
    if (where) {
      query.where(where).$dynamic();
    }
    const results = await query.execute();
    let final = {};
    results.forEach((r) => {
      final = prepareRecords(results, r.main, r.joined, final);
    });
    return final;
  }

  async getByIdWith(
    schema: string,
    id: string | number,
    leftJoin: any | any[],
    fields: any
  ) {
    return await this.getWith(schema, leftJoin, fields, {
      id,
    });
  }
  //   async getAndCount() {}

  // insert
  async add(schema: string, values: any | any[], onConflict: any) {
    let query = this.insert(schema, values);

    if (onConflict) {
      query.onConflictDoUpdate(onConflict).$dynamic();
    }

    return await query.returning();
  }

  // update
  async set(schema: string, values: any, where: any) {
    return await this.update(schema, values, where).returning();
  }
  async setById(schema: string, values: any, id: string | number) {
    return await this.update(schema, values, {
      id,
    }).returning();
  }

  // delete
  async removeWhere(schema: string, where: any) {
    return await this.delete(schema, where).returning();
  }

  async removeById(schema: string, id: string | number) {
    return await this.delete(schema, {
      id,
    }).returning();
  }

  // others
  //   async archive() {}
  //   async archiveBy() {}
  //   async archiveMany() {}

  //   async unarchive() {}
  //   async unarchiveBy() {}
  //   async unarchiveMany() {}

  //   async download() {}
  //   async count() {}
  //   async stats() {}
}

const userRepo = new Repository("users", usersSchema, () => db);

userRepo.get("users");

export { RepositoryBase };
