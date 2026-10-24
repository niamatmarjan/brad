import { createHash, randomUUID } from 'node:crypto';

export const GENESIS_HASH = createHash('sha256').update('AEGISFLOW_GENESIS_RECORD_V1').digest('hex');

export class CryptographicAuditLedger {
  constructor() {
    // Map of tenantId -> Array of AuditRecord
    this.ledger = new Map();
  }

  computeHash(sequence, timestamp, tenantId, actorId, action, entityId, payloadHash, previousHash) {
    const raw = `${sequence}|${timestamp}|${tenantId}|${actorId}|${action}|${entityId}|${payloadHash}|${previousHash}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  hashPayload(payload) {
    const normalized = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    return createHash('sha256').update(normalized).digest('hex');
  }

  append({ tenantId, actorId, action, entityId, payload = {} }) {
    if (!tenantId) throw new Error('TENANT_REQUIRED: Audit record requires tenantId');
    if (!actorId) throw new Error('ACTOR_REQUIRED: Audit record requires actorId');
    if (!action) throw new Error('ACTION_REQUIRED: Audit record requires action');

    if (!this.ledger.has(tenantId)) {
      this.ledger.set(tenantId, []);
    }

    const tenantRecords = this.ledger.get(tenantId);
    const sequence = tenantRecords.length + 1;
    const previousHash = sequence === 1 ? GENESIS_HASH : tenantRecords[sequence - 2].recordHash;
    const timestamp = new Date().toISOString();
    const payloadHash = this.hashPayload(payload);

    const recordHash = this.computeHash(
      sequence,
      timestamp,
      tenantId,
      actorId,
      action,
      entityId || '',
      payloadHash,
      previousHash
    );

    const record = {
      id: randomUUID(),
      sequence,
      timestamp,
      tenantId,
      actorId,
      action,
      entityId: entityId || '',
      payload,
      payloadHash,
      previousHash,
      recordHash
    };

    tenantRecords.push(record);
    return record;
  }

  getRecords(tenantId) {
    return this.ledger.get(tenantId) || [];
  }

  verifyChainIntegrity(tenantId) {
    const records = this.ledger.get(tenantId) || [];
    if (records.length === 0) {
      return { valid: true, totalRecords: 0, message: 'Chain is empty, trivially valid' };
    }

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const expectedPrevHash = i === 0 ? GENESIS_HASH : records[i - 1].recordHash;

      // Check sequence
      if (record.sequence !== i + 1) {
        return {
          valid: false,
          totalRecords: records.length,
          errorAtIndex: i,
          message: `Sequence mismatch at index ${i}: expected ${i + 1}, found ${record.sequence}`
        };
      }

      // Check previous hash linkage
      if (record.previousHash !== expectedPrevHash) {
        return {
          valid: false,
          totalRecords: records.length,
          errorAtIndex: i,
          message: `Hash link broken at sequence ${record.sequence}: previousHash mismatch`
        };
      }

      // Check payload hash
      const computedPayloadHash = this.hashPayload(record.payload);
      if (record.payloadHash !== computedPayloadHash) {
        return {
          valid: false,
          totalRecords: records.length,
          errorAtIndex: i,
          message: `Payload tampering detected at sequence ${record.sequence}`
        };
      }

      // Check record hash
      const computedRecordHash = this.computeHash(
        record.sequence,
        record.timestamp,
        record.tenantId,
        record.actorId,
        record.action,
        record.entityId,
        record.payloadHash,
        record.previousHash
      );

      if (record.recordHash !== computedRecordHash) {
        return {
          valid: false,
          totalRecords: records.length,
          errorAtIndex: i,
          message: `Record hash mismatch at sequence ${record.sequence}`
        };
      }
    }

    return {
      valid: true,
      totalRecords: records.length,
      headHash: records[records.length - 1].recordHash,
      message: 'Complete cryptographic chain integrity confirmed'
    };
  }
}
