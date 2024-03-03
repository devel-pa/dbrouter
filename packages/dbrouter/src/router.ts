interface DBRouterInterface {
  //   reset: () => void;
}

export interface DBConnectionAdapter {
  expire: number;
  connect: (
    connectionString: string,
    expire?: number
  ) => Promise<DBConnectionAdapter>;
  disconnect: () => Promise<any>;
  create: (connectionString: string) => Promise<any>;
  isExpired: () => boolean;
}

class DBRouter implements DBRouterInterface {
  #adapter: DBConnectionAdapter;
  #connections: Map<string, DBConnectionAdapter> = new Map();
  #expire: number = 60 * (30 + Math.random() * 30);

  constructor(adapter: DBConnectionAdapter, expire?: number) {
    this.#adapter = adapter;
    if (expire) {
      this.#expire = expire;
    }
  }

  async connect(adapterId: string, connectionString: string) {
    const connection = await this.#adapter.connect(
      connectionString,
      this.#expire
    );
    this.#connections.set(adapterId, connection);
  }

  async disconnect(adapterId: string) {
    const connection = this.#connections.get(adapterId);
    if (connection) {
      this.#connections.delete(adapterId);
      await connection.disconnect();
    }
  }

  async disconnectAll() {
    [...this.#connections].forEach(([adapterId, val]) => {
      this.disconnect(adapterId);
    });
  }

  async createDatabase(adapterId: string, connectionString: string) {
    await this.#adapter.create(connectionString);
    await this.connect(adapterId, connectionString);
  }

  checkExpired() {
    [...this.#connections].forEach(([adapterId, connection]) => {
      const expired = connection.isExpired();
      if (expired) {
        this.disconnect(adapterId);
      }
    });
  }

  async getConnection(adapterId: string, connectionString: any) {
    let result = null;
    const connection = this.#connections.get(adapterId);
    if (connection) {
      result = connection;
    }
    try {
      await this.connect(adapterId, connectionString);
      result = this.#connections.get(adapterId);
    } catch (e) {
      await this.createDatabase(adapterId, connectionString);
      result = this.#connections.get(adapterId);
    }
    this.checkExpired();
    return result;
  }
}

export default DBRouter;
