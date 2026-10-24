export class ScopedTenantRepository {
  constructor(driver, tenantContext) {
    if (!driver) throw new Error('DRIVER_REQUIRED: Storage driver is required');
    if (!tenantContext || !tenantContext.tenantId) {
      throw new Error('TENANT_CONTEXT_REQUIRED: Valid TenantContext with tenantId is mandatory');
    }
    this.driver = driver;
    this.tenantId = tenantContext.tenantId;
  }

  async create(table, record) {
    if (record.tenantId && record.tenantId !== this.tenantId) {
      const err = new Error('CROSS_TENANT_WRITE_BLOCKED: Record tenantId does not match ScopedRepository context');
      err.code = 'CROSS_TENANT_VIOLATION';
      throw err;
    }
    const scopedRecord = { ...record, tenantId: this.tenantId };
    return this.driver.insert(table, scopedRecord);
  }

  async findById(table, id) {
    const record = await this.driver.findById(table, id);
    if (!record) return null;

    // Strict tenant boundary check: never return records of another tenant
    if (record.tenantId !== this.tenantId) {
      return null; // Zero information leakage
    }
    return record;
  }

  async updateWithVersion(table, id, expectedVersion, updates) {
    if (this.driver.updateWithVersion) {
      return this.driver.updateWithVersion(table, id, expectedVersion, updates, this.tenantId);
    }
    const existing = await this.findById(table, id);
    if (!existing) {
      const err = new Error(`ENTITY_NOT_FOUND: Record ${id} not found in tenant ${this.tenantId}`);
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
    const patch = { ...updates, version: newVersion, tenantId: this.tenantId, updatedAt: new Date().toISOString() };
    return this.driver.update(table, id, patch);
  }

  async query(table, filterFn = null) {
    return this.driver.query(table, record => {
      if (record.tenantId !== this.tenantId) return false;
      return filterFn ? filterFn(record) : true;
    });
  }

  async delete(table, id) {
    const existing = await this.findById(table, id);
    if (!existing) return false;
    return this.driver.delete(table, id);
  }
}
