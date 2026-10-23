import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptographicAuditLedger, GENESIS_HASH } from '../src/audit-ledger.mjs';
import { AuditActions } from '../src/types.mjs';

test('CryptographicAuditLedger: appends sequential records with SHA-256 hash chaining', () => {
  const ledger = new CryptographicAuditLedger();
  const tenant = 'tenant-test';

  const r1 = ledger.append({
    tenantId: tenant,
    actorId: 'user-1',
    action: AuditActions.CR_CREATED,
    entityId: 'cr-101',
    payload: { title: 'First Change' }
  });

  assert.equal(r1.sequence, 1);
  assert.equal(r1.previousHash, GENESIS_HASH);
  assert.ok(r1.recordHash && r1.recordHash.length === 64);

  const r2 = ledger.append({
    tenantId: tenant,
    actorId: 'user-2',
    action: AuditActions.STAGE_APPROVED,
    entityId: 'cr-101',
    payload: { comments: 'Approved' }
  });

  assert.equal(r2.sequence, 2);
  assert.equal(r2.previousHash, r1.recordHash, 'r2 previousHash must equal r1 recordHash');

  const verification = ledger.verifyChainIntegrity(tenant);
  assert.equal(verification.valid, true);
  assert.equal(verification.totalRecords, 2);
});

test('CryptographicAuditLedger: detects tampering when a record payload is modified out of band', () => {
  const ledger = new CryptographicAuditLedger();
  const tenant = 'tenant-tamper';

  ledger.append({ tenantId: tenant, actorId: 'u1', action: AuditActions.CR_CREATED, entityId: 'cr-1', payload: { sum: 100 } });
  ledger.append({ tenantId: tenant, actorId: 'u2', action: AuditActions.STAGE_APPROVED, entityId: 'cr-1', payload: { sum: 100 } });
  ledger.append({ tenantId: tenant, actorId: 'u3', action: AuditActions.CR_SUBMITTED, entityId: 'cr-1', payload: { sum: 100 } });

  // Baseline verification passes
  assert.equal(ledger.verifyChainIntegrity(tenant).valid, true);

  // Attacker tampers directly with record 1 payload
  const records = ledger.getRecords(tenant);
  records[0].payload = { sum: 999999 }; // Illegal tamper

  const failedVerification = ledger.verifyChainIntegrity(tenant);
  assert.equal(failedVerification.valid, false, 'Tampered chain must be detected as invalid');
  assert.equal(failedVerification.errorAtIndex, 0);
  assert.match(failedVerification.message, /tampering detected/i);
});
