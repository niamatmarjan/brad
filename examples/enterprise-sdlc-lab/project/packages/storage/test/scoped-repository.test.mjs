import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDriver } from '../src/memory-driver.mjs';
import { ScopedTenantRepository } from '../src/scoped-repository.mjs';

test('ScopedTenantRepository: enforces tenant scoping on all operations', async () => {
  const driver = new MemoryDriver();
  const repoTenantA = new ScopedTenantRepository(driver, { tenantId: 'tenant-a' });
  const repoTenantB = new ScopedTenantRepository(driver, { tenantId: 'tenant-b' });

  // Tenant A creates an entity
  const entityA = await repoTenantA.create('documents', { id: 'doc-1', title: 'Secret Plan A' });
  assert.equal(entityA.tenantId, 'tenant-a');

  // Tenant A can read it
  const readA = await repoTenantA.findById('documents', 'doc-1');
  assert.ok(readA);
  assert.equal(readA.title, 'Secret Plan A');

  // Tenant B cannot read Tenant A entity (returns null - zero information leakage)
  const readB = await repoTenantB.findById('documents', 'doc-1');
  assert.equal(readB, null, 'Cross-tenant read must return null');

  // Tenant B cannot query Tenant A entities
  const queryB = await repoTenantB.query('documents');
  assert.equal(queryB.length, 0, 'Tenant B query must return 0 results');
});

test('ScopedTenantRepository: optimistic locking prevents concurrent overwrites', async () => {
  const driver = new MemoryDriver();
  const repo = new ScopedTenantRepository(driver, { tenantId: 'tenant-alpha' });

  await repo.create('items', { id: 'item-1', name: 'Original', version: 1 });

  // Update with correct version 1 -> commits version 2
  const v2 = await repo.updateWithVersion('items', 'item-1', 1, { name: 'Updated' });
  assert.equal(v2.version, 2);

  // Stale update still trying to update version 1 -> must throw 409 Conflict
  await assert.rejects(
    () => repo.updateWithVersion('items', 'item-1', 1, { name: 'Conflicting update' }),
    (err) => err.code === 'CONCURRENCY_CONFLICT' && err.status === 409
  );
});
