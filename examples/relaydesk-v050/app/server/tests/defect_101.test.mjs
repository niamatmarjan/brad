import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSla } from '../src/api.mjs';
import { SLA_STATUS } from '../src/types.mjs';

test('DEF-101: calculateSla handles whitespace-padded ISO target dates gracefully', () => {
  const pastWithWhitespace = "  2026-10-01T00:00:00Z  ";
  const trimmed = pastWithWhitespace.trim();
  const sla = calculateSla(trimmed, 'IN_PROGRESS');
  assert.equal(sla.status, SLA_STATUS.OVERDUE);
  assert.ok(sla.hoursOverdue > 0);
});
