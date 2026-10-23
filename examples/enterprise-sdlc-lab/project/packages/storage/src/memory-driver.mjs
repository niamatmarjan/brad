export class MemoryDriver {
  constructor() {
    // Map of collectionName -> Map of ID -> Record
    this.tables = new Map();
  }

  getTable(name) {
    if (!this.tables.has(name)) {
      this.tables.set(name, new Map());
    }
    return this.tables.get(name);
  }

  async insert(table, record) {
    const t = this.getTable(table);
    if (t.has(record.id)) {
      throw new Error(`DUPLICATE_KEY: Record with id ${record.id} already exists`);
    }
    t.set(record.id, JSON.parse(JSON.stringify(record)));
    return JSON.parse(JSON.stringify(record));
  }

  async findById(table, id) {
    const t = this.getTable(table);
    const r = t.get(id);
    return r ? JSON.parse(JSON.stringify(r)) : null;
  }

  async update(table, id, updates) {
    const t = this.getTable(table);
    const existing = t.get(id);
    if (!existing) {
      throw new Error(`NOT_FOUND: Record ${id} in table ${table} not found`);
    }
    const updated = { ...existing, ...updates };
    t.set(id, JSON.parse(JSON.stringify(updated)));
    return JSON.parse(JSON.stringify(updated));
  }

  async updateWithVersion(table, id, expectedVersion, patch, tenantId = null) {
    const t = this.getTable(table);
    const existing = t.get(id);
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      const err = new Error(`NOT_FOUND: Record ${id} in table ${table} not found`);
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (existing.version !== expectedVersion) {
      const err = new Error(
        `CONCURRENCY_CONFLICT: Version mismatch. Expected version ${expectedVersion}, but current is ${existing.version}`
      );
      err.code = 'CONCURRENCY_CONFLICT';
      err.status = 409;
      throw err;
    }
    const newVersion = expectedVersion + 1;
    const updated = { ...existing, ...patch, version: newVersion, updatedAt: new Date().toISOString() };
    t.set(id, JSON.parse(JSON.stringify(updated)));
    return JSON.parse(JSON.stringify(updated));
  }

  async query(table, filterFn) {
    const t = this.getTable(table);
    const results = [];
    for (const record of t.values()) {
      if (!filterFn || filterFn(record)) {
        results.push(JSON.parse(JSON.stringify(record)));
      }
    }
    return results;
  }

  async delete(table, id) {
    const t = this.getTable(table);
    return t.delete(id);
  }

  async clear() {
    this.tables.clear();
  }
}
